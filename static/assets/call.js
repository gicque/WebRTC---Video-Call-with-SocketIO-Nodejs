'use strict';

const baseURL = "/"

let localVideo = document.querySelector('#localVideo');
let remoteVideo = document.querySelector('#remoteVideo');

let otherUser;
let remoteRTCMessage;

let iceCandidatesFromCaller = [];
let peerConnection;
let remoteStream;
let localStream;

let callInProgress = false;

// === helper
function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
  
    // Change this to div.childNodes to support multiple top-level nodes.
    return div.firstChild;
}

function generate_username(){
    var adjectives = ["small", "blue" /*, "Ugly"*/, "alizarin","amaranth","amber","amethyst","apricot","aqua","aquamarine","asparagus","auburn","azure","beige","bistre","black","blue","brass","bronze","brown","buff","burgundy","cardinal","carmine","cerise","cerulean","champagne","charcoal","chartreuse","chestnut","chocolate","cinnabar","cinnamon","cobalt","copper","coral","corn","cornflower","cream","crimson","cyan","dandelion","denim","ecru","emerald","eggplant","firebrick","flax","fuchsia","gamboge","gold","goldenrod","green","grey","harlequin","heliotrope","indigo","ivory","jade","khaki","lavender","lemon","lilac","lime","linen","magenta","magnolia","malachite","maroon","mauve","mustard","myrtle","ochre","olive","olivine","orange","orchid","peach","pear","periwinkle","persimmon","pink","platinum","plum","puce","pumpkin","purple","razzmatazz","red","rose","ruby","russet","rust","saffron","salmon","sangria","sapphire","scarlet","seashell","sepia","silver","smalt","tan","tangerine","taupe","teal","thistle","tomato","turquoise","ultramarine","vermilion","violet","viridian","wheat","white","wisteria","yellow","zucchini"];;
    var nouns = ["bear", "dog", "banana", "ape","baboon","badger","bat","bear","bird","bobcat","bulldog","bullfrog","cat","catfish","cheetah","chicken","chipmunk","cobra","cougar","cow","crab","deer","dingo","dodo","dog","dolphin","donkey","dragon","dragonfly","duck","eagle","earwig","eel","elephant","emu","falcon","fireant","firefox","fish","fly","fox","frog","gecko","goat","goose","grasshopper","horse","hound","husky","impala","insect","jellyfish","kangaroo","ladybug","liger","lion","lionfish","lizard","mayfly","mole","monkey","moose","moth","mouse","mule","newt","octopus","otter","owl","panda","panther","parrot","penguin","pig","puma","pug","quail","rabbit","rat","rattlesnake","robin","seahorse","sheep","shrimp","skunk","sloth","snail","snake","squid","starfish","stingray","swan","termite","tiger","treefrog","turkey","turtle","vampirebat","walrus","warthog","wasp","wolverine","wombat","yak","zebra"];

    var adj_index = Math.floor(Math.random() * adjectives.length);
    var noun_index = Math.floor(Math.random() * nouns.length);
    //var rnd =  Math.random().toString(36).substr(2, 9).slice(-3);
    let rnd =  Math.floor(Math.random() * (999 - 100 + 1)) + 100;
    let name = adjectives[adj_index] + '-' + nouns[noun_index] + '-' + rnd;
    return name;
}


// document.addEventListener('DOMContentLoaded', function() {
//     if (!Notification) {
//      alert('Desktop notifications not available in your browser. Try Chromium.');
//      return;
//     }
   
//     if (Notification.permission !== 'granted')
//      Notification.requestPermission();
//    });
   
   
function notifyMe() {
    if (Notification.permission !== 'granted')
     Notification.requestPermission();
    else {
     var notification = new Notification('Appel entrant', {
      
      body: 'Vous avez un appel entrant!',
     });
     notification.onclick = function() {
      window.open('https://stackoverflow.com/a/13328397/1269037');
     };
    }
   }

var audio = new Audio('https://upload.wikimedia.org/wikipedia/commons/3/34/Sound_Effect_-_Door_Bell.ogg');

function notify_incoming_call(){
  audio.play();
  //alert('We are redirecting your call to our Customer Service Representative.\nPlease wait.');
  notifyMe
}

// === event from html
function call() {
    let userToCall = document.getElementById("callName").value.toLowerCase();
    otherUser = userToCall;

    beReady()
        .then(bool => {
            processCall(userToCall)
        })
}

function call_by_name(userToCall){
    otherUser = userToCall;

    beReady()
        .then(bool => {
            processCall(userToCall)
        })
}

function answer() {
    //do the event firing

    beReady()
        .then(bool => {
            processAccept();
        })

    document.getElementById("answer").style.display = "none";
}

function cancel_call(){
    console.log(myName, 'cancel_call')
    socket.emit("hangupCall", {
        caller: otherUser,
        rtcMessage: ''
    });
    stop()
}

function hangup_call(){
    console.log(myName, 'hangup_call')
    socket.emit("hangupCall", {
        caller: otherUser,
        rtcMessage: ''
    });
    stop()
}

   

// ===

let pcConfig = {
    "iceServers":
        [
            { "url": "stun:stun.jap.bloggernepal.com:5349" },
            // {
            //     "url": "turn:turn.jap.bloggernepal.com:5349",
            //     "username": "guest",
            //     "credential": "somepassword"
            // },
            {
                "url": "turn:turn.anyfirewall.com:443?transport=tcp",
                "username": "webrtc",
                "credential": "webrtc"
            }
        ]
};

// Set up audio and video regardless of what devices are present.
let sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
};

//===============================================================================

let socket;
function connectSocket() {
    socket = io.connect(baseURL, {
        query: {
            name: myName
        }
    });

    socket.on('newCall', data => {
        //when other called you
        console.log(data);
        //show answer button

        otherUser = data.caller;
        remoteRTCMessage = data.rtcMessage

        // document.getElementById("profileImageA").src = baseURL + callerProfile.image;
        document.getElementById("callerName").innerHTML = otherUser;
        document.getElementById("call").style.display = "none";
        document.getElementById("answer").style.display = "block";

        notify_incoming_call();

    })

    socket.on('callAnswered', data => {
        //when other accept our call
        remoteRTCMessage = data.rtcMessage
        peerConnection.setRemoteDescription(new RTCSessionDescription(remoteRTCMessage));

        document.getElementById("calling").style.display = "none";

        console.log("Call Started. They Answered");
        // console.log(pc);

        callProgress()
    })
    
    socket.on('hangupCall', data => {
        console.log(myName, 'socket.on.hangup')
        stop();        
    })

    socket.on('ICEcandidate', data => {
        // console.log(data);
        console.log("GOT ICE candidate");

        let message = data.rtcMessage

        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });

        if (peerConnection) {
            console.log("ICE candidate Added");
            peerConnection.addIceCandidate(candidate);
        } else {
            console.log("ICE candidate Pushed");
            iceCandidatesFromCaller.push(candidate);
        }

    })

    socket.on('user_list', data => {
        console.log(data, 'socket.on.users')

        let ul = document.createElement('ul');
    
        const data_filtered = data.filter(x => x!=myName)

        // Aucun autre membre connecté
        if(data_filtered.length==0){
            document.getElementById('user_list').innerHTML = 'Aucun autre membre connecté';
            return;
        }

        document.getElementById('user_list').innerHTML = '';
        document.getElementById('user_list').appendChild(ul);
        
        data.forEach(function (name) {

            if(name==myName) return;

            //let li = document.createElement('li');
            let li = createElementFromHTML(`<li><span onclick="call_by_name('${name}')">${name} (Appeler ☎️)</span></li>`)
            ul.appendChild(li);
        
            //li.innerHTML += name;
        });

        // const div_user_list = document.querySelector('#user_list')
        // if(div_user_list){
        //     div_user_list.innerHTML = li.outerHTML
        // }
        

        //stop();        
    })

}

/**
 * 
 * @param {Object} data 
 * @param {number} data.name - the name of the user to call
 * @param {Object} data.rtcMessage - the rtc create offer object
 */
async function sendCall(data) {
    //to send a call
    console.log("Send Call");
    socket.emit("call", data, function(x){
        console.log('sendCall callback', x)
        if(x && x.cancel){
            document.getElementById("call").style.display = "block";
            document.getElementById("calling").style.display = "none";
            console.log('sendCall callback: utilisateur non trouvé')
        }
    });
    //console.log('sendCall', r)

    document.getElementById("call").style.display = "none";
    // document.getElementById("profileImageCA").src = baseURL + otherUserProfile.image;
    document.getElementById("otherUserNameCA").innerHTML = otherUser;
    document.getElementById("calling").style.display = "block";
}

/**
 * 
 * @param {Object} data 
 * @param {number} data.caller - the caller name
 * @param {Object} data.rtcMessage - answer rtc sessionDescription object
 */
function answerCall(data) {
    //to answer a call
    socket.emit("answerCall", data);
    callProgress();
}

/**
 * 
 * @param {Object} data 
 * @param {number} data.user - the other user //either callee or caller 
 * @param {Object} data.rtcMessage - iceCandidate data 
 */
function sendICEcandidate(data) {
    //send only if we have caller, else no need to
    //console.log("Send ICE candidate");
    socket.emit("ICEcandidate", data)
}

function beReady() {
    return navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = stream;

            return createConnectionAndAddStream()
        })
        .catch(function (e) {
            alert('getUserMedia() error: ' + e.name);
        });
}

function createConnectionAndAddStream() {
    createPeerConnection();
    peerConnection.addStream(localStream);
    return true;
}

function processCall(userName) {
    peerConnection.createOffer((sessionDescription) => {
        peerConnection.setLocalDescription(sessionDescription);
        sendCall({
            name: userName,
            rtcMessage: sessionDescription
        })
    }, (error) => {
        console.log("Error");
    });
}

function processAccept() {

    peerConnection.setRemoteDescription(new RTCSessionDescription(remoteRTCMessage));
    peerConnection.createAnswer((sessionDescription) => {
        peerConnection.setLocalDescription(sessionDescription);

        if (iceCandidatesFromCaller.length > 0) {
            //I am having issues with call not being processed in real world (internet, not local)
            //so I will push iceCandidates I received after the call arrived, push it and, once we accept
            //add it as ice candidate
            //if the offer rtc message contains all thes ICE candidates we can ingore this.
            for (let i = 0; i < iceCandidatesFromCaller.length; i++) {
                //
                let candidate = iceCandidatesFromCaller[i];
                console.log("ICE candidate Added From queue");
                try {
                    peerConnection.addIceCandidate(candidate).then(done => {
                        console.log(done);
                    }).catch(error => {
                        console.log(error);
                    })
                } catch (error) {
                    console.log(error);
                }
            }
            iceCandidatesFromCaller = [];
            console.log("ICE candidate queue cleared");
        } else {
            console.log("NO Ice candidate in queue");
        }

        answerCall({
            caller: otherUser,
            rtcMessage: sessionDescription
        })

    }, (error) => {
        console.log("Error");
    })
}

//===============================================================================

function createPeerConnection() {
    try {
        peerConnection = new RTCPeerConnection(pcConfig);
        // peerConnection = new RTCPeerConnection();
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
        return;
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

function handleIceCandidate(event) {
    // console.log('icecandidate event: ', event);
    if (event.candidate) {
        //console.log("Local ICE candidate");
        // console.log(event.candidate.candidate);

        sendICEcandidate({
            user: otherUser,
            rtcMessage: {
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }
        })

    } else {
        console.log('End of candidates.');
    }
}

function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
}

window.onbeforeunload = function () {
    if (callInProgress) {
        stop();
    }
};

function stop() {
    if(localStream){
        localStream.getTracks().forEach(track => track.stop());
    }
    
    callInProgress = false;
    if(peerConnection){
        peerConnection.close();
    }        
    peerConnection = null;
    document.getElementById("call").style.display = "block";
    document.getElementById("answer").style.display = "none";
    document.getElementById("inCall").style.display = "none";
    document.getElementById("calling").style.display = "none";
    //document.getElementById("endVideoButton").style.display = "none"
    document.getElementById("videos").style.display = "none";
    otherUser = null;
}

function callProgress() {

    document.getElementById("videos").style.display = "block";
    document.getElementById("otherUserNameC").innerHTML = otherUser;
    document.getElementById("inCall").style.display = "block";

    callInProgress = true;
}
