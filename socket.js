const { Server } = require('socket.io');
let IO;

class TwoWayMap {
    constructor(map = {}) {
       this.map = map;
       for(const key in map) {
          	const value = map[key];
          	this.map[value] = key;   
       }
    }
    get(key) { 
        return this.map[key]; 
    }

    set(key, value) { 
    
    	const val1 = this.map[key] 
        const val2 = this.map[value] 
        
        delete this.map[key] 
        delete this.map[value]         
        delete this.map[val1] 
        delete this.map[val2] 
        
        this.map[key] = value; 
        this.map[value] = key; 
    }
    unset(key) { 
        const value = this.map[key] ;
        delete this.map[key] 
        delete this.map[value] 
    }
}


module.exports.initIO = (httpServer) => {
    IO = new Server(httpServer);

    IO.use((socket, next) => {
        if (socket.handshake.query) {
            let userName = socket.handshake.query.name
            socket.user = userName;
            next();
        }
    })

    let all_user_list = [];
    let all_calls = new TwoWayMap({});
    
    IO.on('connection', async (socket) => {
        console.log(socket.user, "Connected");
        socket.join(socket.user);
        all_user_list.push(socket);
        console.log('all_user_list', all_user_list.map(x => x.user))
        IO.emit('user_list',  all_user_list.map(x => x.user))

        //const sockets = await IO.fetchSockets();
        //console.log('rooms', IO.sockets.adapter.rooms);
        console.log('rooms', IO.sockets.adapter.rooms.keys());

        socket.on('call', (data, callback) => {
            let callee = data.name;
            let rtcMessage = data.rtcMessage;

            console.log('callee', callee)
            console.log('has callee', IO.sockets.adapter.rooms.has(callee))
            // console.log('trying to call', IO.sockets.adapter.rooms.get(callee))
            // console.log('trying to call', IO.sockets.adapter.rooms[callee])

            if (!IO.sockets.adapter.rooms.has(callee)){
                console.log('trying to call', callee, 'not found')
                console.log('on.call.rooms', IO.sockets.adapter.rooms)
                console.log('on.call.rooms', IO.sockets.adapter.rooms.keys())
                //TODO response not available
                console.log('call', (typeof data))
                callback({cancel: true})
            }

            //TODO if in other call cancel

            socket.to(callee).emit("newCall", {
                caller: socket.user,
                rtcMessage: rtcMessage
            })

            callback({ok: true})

        })

        socket.on('answerCall', (data) => {
            let caller = data.caller;
            rtcMessage = data.rtcMessage

            socket.to(caller).emit("callAnswered", {
                callee: socket.user,
                rtcMessage: rtcMessage
            })

            all_calls.set(data.caller, socket.user)
            console.log('all_calls', all_calls)


        })

        // TODO
        socket.on('hangupCall', (data) => {

            console.log('hangupCall', data);

            let caller = data.caller;
            rtcMessage = data.rtcMessage

            socket.to(caller).emit("hangupCall", {
                callee: socket.user,
                rtcMessage: rtcMessage
            })

            all_calls.unset(caller)
            console.log('all_calls', all_calls)

        })

        socket.on('ICEcandidate', (data) => {
            let otherUser = data.user;
            let rtcMessage = data.rtcMessage;

            socket.to(otherUser).emit("ICEcandidate", {
                sender: socket.user,
                rtcMessage: rtcMessage
            })
        })

        socket.on('disconnect', function() {
            console.log('Got disconnect!', socket.user);
      
            var i = all_user_list.indexOf(socket.user);
            all_user_list.splice(i, 1);
            console.log('all_user_list', all_user_list.map(x => x.user))
            IO.emit('user_list',  all_user_list.map(x => x.user))

            all_calls.unset(socket.user)
            console.log('all_calls', all_calls)
            
         });
    })
}

module.exports.getIO = () => {
    if (!IO) {
        throw Error("IO not initilized.")
    } else {
        return IO;
    }
}