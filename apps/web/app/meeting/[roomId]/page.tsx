"use client"
import ChatPanel from '@/components/ChatPannel';
import MessageSquareElement from '@/components/MessageSquare';
import { VideoContainer } from '@/components/VideoContainer';
import { useAuth } from '@clerk/nextjs';
import React, { use, useEffect, useRef, useState } from 'react'

interface Message {
    id: string;
    sender: "me" | "other";
    content: string;
}

const WS_SERVER = process.env.NEXT_PUBLIC_WS_SERVER
console.log(`server: ${WS_SERVER}`);

const MeetingRoom = ({ params }: {

    params: Promise<{ roomId: string }>

}) => {
    const { roomId } = use(params);
    const [ws, setWs] = useState<WebSocket | null>(null);
    // Update messages state to use Message[] instead of { userId: string; message: string }[]
    const [messages, setMessages] = useState<Message[]>([]);
    const userId = useRef<string>(`user-${Math.random().toString(36).substring(7)}`);
    const { getToken } = useAuth();

    useEffect(() => {
        const initWebSocket = async () => {

            const wsUrl = `${WS_SERVER}`;
            const socket = new WebSocket(wsUrl);

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

                if (data.type === "MESSAGE") {
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
            };
        };

        // Initialize the WebSocket connection
        const cleanup = initWebSocket();

        return () => {
            cleanup.then((fn) => fn && fn());
        };

    }, [roomId, getToken]);


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

    return (
        <div className="flex h-auto py-20 overflow-hidden">
            <div className="flex-1 p-4 ">
                <VideoContainer />
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