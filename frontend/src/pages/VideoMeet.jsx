import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import styles from "../styles/videoComponent.module.css";
import { Button,Badge, IconButton, TextField } from '@mui/material';
const server_url="http://localhost:8000";
var connections={};
const peerConfigConnections={
    "iceServers":[
        {"urls":"stun:stun.l.google.com:19302"}
    ]
}
export default function VideoMeetComponent() {
    var socketRef=useRef();
    let socketIdRef=useRef();
    let localVideoRef=useRef();
    let [videoAvailable,setVideoAvailable]=useState(true);
    let [audioAvailable,setAudioAvailable]=useState(true);
    let [video,setVideo]=useState([]);
    let [audio,setAudio]=useState();
    let [screen,setScreen]=useState();
    let [showModal,setShowModal]=useState(true);
    let [screenAvailable,setScreenAvailable]=useState();
    let [messages,setMessages]=useState([]);
    let [message,setMessage]=useState("");
    let [newMessages,setNewMessages]=useState(0);
    let [askForUsername,setAskForUsername]=useState(true);
    let [username,setUsername]=useState("");
    const videoRef=useRef([]);
    let [videos,setVideos]=useState([]);
    // if(isChrome()===false){

    // }
    useEffect(()=>{
        console.log("getting permissions");
        getPermissions();
        console.log('permissions granted');
    }, []);
    let getDisplayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDisplayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }
    const getPermissions=async ()=>{
        try{
            const videoPermission=await navigator.mediaDevices.getUserMedia({video:true});
            if(videoPermission){
                setVideoAvailable(true);
                console.log('Video permission granted');
            }else{
                setVideoAvailable(false);
                console.log('Video permission denied');
            }
            const audioPermission=await navigator.mediaDevices.getUserMedia({audio:true});
            if(audioPermission){
                setAudioAvailable(true);
                console.log('Audio permission granted');
            }else{
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }
            if(navigator.mediaDevices.getDisplayMedia){
                setScreenAvailable(true);
            }else{
                setScreenAvailable(false);
            }
            if(videoAvailable || audioAvailable){
                const userMediaStream=await navigator.mediaDevices.getUserMedia({video: videoAvailable, audio: audioAvailable});
                if(userMediaStream){
                    window.localStream=userMediaStream;
                    if(localVideoRef.current){
                        localVideoRef.current.srcObject=userMediaStream;
                    }
                }
            }
        }catch(err){
            console.log(err);
        }
    }
    useEffect(()=>{
        if(video!==undefined && audio!==undefined){
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);
        }
    },[video, audio]);
    useEffect(() => {
        if (screen !== undefined) {
            getDisplayMedia();
        }
    }, [screen])
    let getMedia=()=>{
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }
    let handleScreen = () => {
        setScreen(!screen);
    }
    let getDisplayMediaSuccess = (stream) => {
        console.log("HERE")
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoRef.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoRef.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoRef.current.srcObject = window.localStream

            getUserMedia()

        })
    }

    let getUserMediaSuccess=(stream)=>{
        try{
            console.log('trying')
            window.localStream.getTracks().forEach(track=>track.stop());
            console.log('tried');
        }catch(e){
            console.log(e);
        }
        window.localStream=stream;
        localVideoRef.current.srcObject=stream;
        console.log(connections);
        console.log(Object.keys(connections).length);
        for(let id in connections){
            console.log(id);
            if(id===socketIdRef.current)continue;
            connections[id].addStream(window.localStream);
            connections[id].createOffer().then((description)=>{
                console.log(description);
                connections[id].setLocalDescription(description)
                .then(()=>{
                    socketRef.current.emit('signal',id,JSON.stringify({'sdp':connections[id].localDescription}))
                }).catch(e=>console.log(e))
            })
        }
        stream.getTracks().forEach(track=>track.onended=()=>{
            setVideo(false);
            setAudio(false);
            try{
                let tracks=localVideoRef.current.srcObject.getTracks()
                tracks.forEach(track=>track.stop())
            }catch(e){
                console.log(e)
            }
            let blackSilence=(...args)=>new MediaStream([black(...args),silence()]);
            window.localStream=blackSilence();
            localVideoRef.current.srcObject=window.localStream;
            for(let id in connections){
                connections[id].addStream(window.localStream)
                connections[id].createOffer().then((description)=>{
                    connections[id].setLocalDescription(description)
                    .then(()=>{
                        socketRef.current.emit('signal',id,JSON.stringify({'sdp':connections[id].localDescription}))
                    }).catch(e=>console.log(e));
                })
            }
        })
    }
    let silence=()=>{
        let ctx=new AudioContext();
        let oscillator=ctx.createOscillator();
        let dst=oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0],{enabled:false})
    }
    let black=({width=640, height=480}={})=>{
        let canvas=Object.assign(document.createElement("canvas"),{width,height});
        canvas.getContext('2d').fillRect(0,0,width,height);
        let stream=canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0],{enabled: false});
    }
    let handleVideo = () => {
        setVideo(!video);
        // getUserMedia();
    }
    let handleAudio = () => {
        setAudio(!audio)
        // getUserMedia();
    }
    let getUserMedia=()=>{
        if((video && videoAvailable) || (audio && audioAvailable)){
            navigator.mediaDevices.getUserMedia({video:video,audio:audio})
            .then(getUserMediaSuccess)
            .then((stream)=>{})
            .catch((e)=>console.log(e))
        }else{
            try{
                let tracks=localVideoRef.current.srcObject.getTracks();
                tracks.forEach(track=>track.stop());
            }catch(e){
                console.error(e);
            }
        }
    }
    
    
    let gotMessageFromServer=(fromId,message)=>{
        var signal=JSON.parse(message);
        console.log(`📩 Signal received from ${fromId}:`, signal);
        if(fromId!==socketIdRef.current){
            if(signal.sdp){
                console.log("💬 Setting Remote SDP");
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(()=>{
                    if(signal.sdp.type==='offer'){
                        connections[fromId].createAnswer().then((description)=>{
                            connections[fromId].setLocalDescription(description).then(()=>{
                                socketRef.current.emit('signal',fromId,JSON.stringify({'sdp':connections[fromId].localDescription}))
                            }).catch(e=>console.log(e));
                        }).catch(e=>console.log(e))
                    }
                }).catch(e=>console.log(e))
            }
            if(signal.ice){
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e=>console.log(e));
            }
        }
    }
    let addMessage=()=>{

    }
    let connectToSocketServer=()=>{
        socketRef.current=io.connect(server_url,{secure:false});
        socketRef.current.on('signal',gotMessageFromServer);
        socketRef.current.on('connect',()=>{
            
            socketRef.current.emit('join-call', window.location.href);
            socketIdRef.current=socketRef.current.id;
            socketRef.current.on('chat-message',addMessage);
            socketRef.current.on('user-left',(id)=>{
                setVideos((videos)=>videos.filter((video)=>video.socketId!==id))
            })
            socketRef.current.on('user-joined',(id,clients)=>{
                clients.forEach((socketListId)=>{
                    connections[socketListId]=new RTCPeerConnection(peerConfigConnections)
                    connections[socketListId].onicecandidate=function (e){
                        if(e.candidate!=null){
                            socketRef.current.emit('signal',socketListId,JSON.stringify({'ice':e.candidate}))
                        }
                    }
                    connections[socketListId].onaddstream=(e)=>{
                        // console.log("BEFORE:", videoRef.current);
                        // console.log("FINDING ID: ", socketListId);
                        console.log("New Stream Added from:", socketListId);
                        console.log("🔍 Received Stream:", e.stream);
                        console.log("Current VideoRefs:", videoRef.current);
                        let videoExists=videoRef.current.find(video=>video.socketId===socketListId);
                        if(videoExists){
                            console.log("FOUND EXISTING");
                            setVideos(videos=>{
                                const updatedVideos=videos.map(video=>
                                    video.socketId===socketListId?{...video,stream:e.stream}:video 
                                );
                                console.log("Updated Videos:", updatedVideos);
                                videoRef.current=updatedVideos;
                                return updatedVideos;
                            })
                        }else{
                            console.log("CREATING NEW VIDEO ENTRY");
                            let newVideo={
                                socketId:socketListId,
                                stream:e.stream,
                                autoplay:true,
                                playsinline:true 
                            }
                            setVideos(videos=>{
                                const updatedVideos=[...videos,newVideo];
                                console.log("New Videos Array:", updatedVideos);
                                videoRef.current=updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };
                    if(window.localStream!==undefined && window.localStream!==null){
                        console.log("Adding local stream to new connection:", window.localStream);
                        connections[socketListId].addStream(window.localStream);
                    }else{
                        console.error("window.localStream is not set yet when trying to add stream!");
                        let blackSilence=(...args)=>new MediaStream([black(...args),silence()]);
                        window.localStream=blackSilence();
                        connections[socketListId].addStream(window.localStream);
                    }
                })
                if(id===socketIdRef.current){
                    for(let id2 in connections){
                        if(id2===socketIdRef.current)continue;
                        try{
                            connections[id2].addStream(window.localStream);
                        }catch(e){
                            console.error(e);
                        }
                        connections[id2].createOffer().then((description)=>{
                            connections[id2].setLocalDescription(description)
                            .then(()=>{
                                socketRef.current.emit('signal',id2,JSON.stringify({"sdp":connections[id2].localDescription}))
                            })
                            .catch(e=>console.log(e));
                        })
                    }
                }
            })
            console.log("Socket connected:", socketRef.current.connected);
        })
    }
    
    let connect=()=>{
        setAskForUsername(false);
        getMedia();
    }
  return (
    <div>
        {
        askForUsername===true?
            <div>
                <h2>Enter into Lobby</h2> 
                <TextField id="outlined-basic" label="Username" value={username} onChange={e=>setUsername(e.target.value)} variant="outlined"/>
                <Button variant="contained" onClick={connect}>Connect</Button>
                <div>
                    <video ref={localVideoRef} autoPlay muted></video>
                </div>
            </div>:<div className={styles.meetVideoContainer}>
                <video className={styles.meetUserVideo} ref={localVideoRef} autoPlay muted></video>
                {console.log("Rendering videos state:", videos)}

                {
                videos.map((video)=>(
                    <div key={video.socketId}>
                        <h2>{video.socketId}</h2>
                        <video data-socket={video.socketId} ref={ref=>{
                            if(ref && video.stream){
                                console.log(`Attaching stream for ${video.socketId}`);
                                ref.srcObject=video.stream;
                            }
                        }} autoPlay></video>
                    </div>
                ))}
            </div>
        }
    </div>
  )
}
