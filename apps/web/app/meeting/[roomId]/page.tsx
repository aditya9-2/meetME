/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import ChatPanel from '@/components/ChatPannel';
import MessageSquareElement from '@/components/MessageSquare';
import { VideoContainer } from '@/components/VideoContainer';
// import { useAuth } from '@clerk/nextjs';
import React, { use, useEffect, useRef, useState } from 'react'
import { useMediaStream } from '@/hooks/useMediaStream';

interface Message {
    id: string;
    sender: "me" | "other";
    content: string;
}

interface RemoteUser {
    id: string;
    name: string;
    stream: MediaStream | null;
}

const WS_SERVER = process.env.NEXT_PUBLIC_WS_SERVER


const MeetingRoom = ({ params }: {

    params: Promise<{ roomId: string }>

}) => {

    const { roomId } = use(params);
    const { stream: localStream } = useMediaStream();

    const [ws, setWs] = useState<WebSocket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);

    const userId = useRef<string>(`user-${Math.random().toString(36).substring(7)}`);
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());


    // const { getToken } = useAuth();

    useEffect(() => {

        const initWebSocket = async () => {

            const wsUrl = WS_SERVER;
            const socket = new WebSocket(wsUrl!);

            // When the socket connection opens, send a JOIN_MEETING message
            socket.onopen = () => {
                socket.send(
                    JSON.stringify({
                        type: "JOIN_MEETING",
                        payload: { roomId, userId: userId.current, name: `User-${userId.current}` },
                    })
                );
            };


            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);


                if (data.type === "USER_JOINED") {
                    const { userId: remoteUserId, name } = data?.payload;

                    if (remoteUserId !== userId.current) {
                        initiatePeerConnection(remoteUserId, name);
                    }
                    return;

                } else if (data.type === "OFFER") {

                    handleAnswer(data.payload);

                } else if (data.type === "ANSWER") {

                    handleOffer(data.payload)

                } else if (data.type === "ICE_CANDIDATE") {

                    handleIceCandidate(data.payload)

                } else if (data.type === "USER_LEFT") {

                    handleUserLeft(data.payload.userId);

                } else if (data.type === "MESSAGE") {
                    // Convert the incoming data into the Message type expected by ChatPanel
                    const newMessage: Message = {
                        id: Date.now().toString(),
                        sender: data.payload.userId === userId.current ? "me" : "other",
                        content: data.payload.message,
                    };
                    setMessages((prev) => [...prev, newMessage]);
                }
            };

            socket.onclose = () => {
                console.log("WebSocket closed");
            };

            setWs(socket);


            return () => {
                // Before sending the LEAVE_MEETING message, check that the socket is open
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(
                        JSON.stringify({
                            type: "LEAVE_MEETING",
                            payload: { roomId, userId: userId.current },
                        })
                    );
                }
                socket.close();
                peerConnections.current.forEach((pc) => pc.close()) // close all peer connection
                peerConnections.current.clear();
            };
        };

        // Initialize the WebSocket connection
        initWebSocket();

        return () => {
            peerConnections.current.forEach(pc => pc.close());
            peerConnections.current.clear();
        };

    }, [roomId]);

    const createPeerConnection = (remoteUserId: string, remoteUsername: string) => {

        const pc = new RTCPeerConnection({
            iceServers: [{
                urls: "stun:stun.l.google.com:19302" // free Google STUN server
            }]
        });

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                ws?.send(JSON.stringify({
                    type: "ICE_CANDIDATE",
                    payload: {
                        roomId,
                        senderId: userId.current,
                        receiverId: remoteUserId,
                        candidate: e.candidate,
                    }
                }));
            }
        }

        pc.ontrack = (e) => {
            setRemoteUsers((prev) => {
                const user = prev.find(u => u.id === remoteUserId);
                const stream = user?.stream || new MediaStream();
                stream.addTrack(e.track);

                if (!user) {
                    return [...prev, {
                        id: remoteUserId,
                        name: remoteUsername,
                        stream
                    }];
                }

                return prev.map(u => u.id === remoteUserId ? { ...u, stream } : u)
            });
        }

        peerConnections.current.set(remoteUserId, pc);
        return pc;
    }

    const initiatePeerConnection = (remoteUserId: string, remoteUsername: string) => {
        const pc = createPeerConnection(remoteUserId, remoteUsername);

        localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream));

        pc.createOffer()
            .then((offer) => {
                pc.setLocalDescription(offer); // Set our offer as the local description
                ws?.send(
                    JSON.stringify({
                        type: "OFFER",
                        payload: { roomId, senderId: userId.current, receiverId: remoteUserId, sdp: offer.sdp },
                    })
                );
            })
            .catch((err) => console.error("Error creating offer:", err));
    }

    // Handle an offer from another user
    const handleOffer = (payload: { senderId: string; receiverId: string; sdp: string }) => {
        const { senderId, sdp } = payload;
        let pc = peerConnections.current.get(senderId);
        if (!pc) {
            // If no connection exists, create one
            pc = createPeerConnection(senderId, `User-${senderId}`);
            localStream?.getTracks().forEach((track) => pc?.addTrack(track, localStream));
        }
        // Set the received offer as the remote description and respond with an answer
        pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }))
            .then(() => pc.createAnswer())
            .then((answer) => {
                pc.setLocalDescription(answer); // Set our answer as the local description
                ws?.send(
                    JSON.stringify({
                        type: "ANSWER",
                        payload: { roomId, senderId: userId.current, receiverId: senderId, sdp: answer.sdp },
                    })
                );
            })
            .catch((err) => console.error("Error handling offer:", err));
    };

    // Handle an answer from another user
    const handleAnswer = (payload: { senderId: string; sdp: string }) => {
        const { senderId, sdp } = payload;
        const pc = peerConnections.current.get(senderId);
        if (pc) {
            // Set the received answer as the remote description
            pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp })).catch((err) =>
                console.error("Error setting remote description:", err)
            );
        }
    };

    // Handle an ICE candidate from another user
    const handleIceCandidate = (payload: { senderId: string; candidate: any }) => {
        const { senderId, candidate } = payload;
        const pc = peerConnections.current.get(senderId);
        if (pc) {
            // Add the ICE candidate to help establish the connection
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) =>
                console.error("Error adding ICE candidate:", err)
            );
        }
    };

    // Clean up when a user leaves
    const handleUserLeft = (userIdLeft: string) => {
        const pc = peerConnections.current.get(userIdLeft);
        if (pc) {
            pc.close(); // Close the peer connection
            peerConnections.current.delete(userIdLeft); // Remove it from the map
        }
        // Remove the user from the remote users list
        setRemoteUsers((prev) => prev.filter((user) => user.id !== userIdLeft));
    };

    const sendMessage = (message: string) => {

        if (ws && message.trim() && ws.readyState === WebSocket.OPEN) {
            ws.send(
                JSON.stringify({
                    type: "SEND_MESSAGE",
                    payload: { roomId, userId: userId.current, message },
                })
            );
        } else {
            console.warn("WebSocket is not open. Message not sent.");
        }
    };

    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    }

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOn(videoTrack.enabled);
            }
        }
    }

    return (
        <div className="flex h-auto py-20 overflow-hidden">
            <div className="flex-1 p-4 ">
                <VideoContainer
                    localStream={localStream}
                    remoteUsers={remoteUsers}
                    toggleMic={toggleMic}
                    toggleVideo={toggleVideo}
                    isMicOn={isMicOn}
                    isVideoOn={isVideoOn}
                />
            </div>

            <div className="w-[350px] border-l border-border h-full flex flex-col bg-background">
                <MessageSquareElement />
                <div className="flex-1 ">
                    <ChatPanel roomId={roomId} sendMessage={sendMessage} messages={messages} />
                </div>
            </div>
        </div>
    )
}

export default MeetingRoom