/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

interface RemoteUser {
    id: string;
    stream: MediaStream | null;
    name: string;
}

interface VideoContainerProps {
    localStream: MediaStream | null;
    remoteUsers: RemoteUser[];
    toggleMic: () => void;
    toggleVideo: () => void;
    isMicOn: boolean
    isVideoOn: boolean
}

export const VideoContainer = ({
    localStream,
    remoteUsers,
    toggleMic,
    toggleVideo,
    isMicOn,
    isVideoOn

}: VideoContainerProps) => {

    useEffect(() => {
        console.log("Remote users:", remoteUsers);
    }, [remoteUsers]);


    return (
        <div className="container mx-auto px-4 py-6 min-h-screen">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">

                {localStream && (
                    <Card
                        key="local"
                        className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted shadow-sm relative"
                    >
                        <div className="relative aspect-video bg-black">
                            <video
                                className="h-full w-full object-cover"
                                autoPlay // Play the video automatically
                                playsInline // Play inline on mobile devices
                                muted // Mute local video to avoid feedback
                                ref={(el) => {
                                    if (el) el.srcObject = localStream; // Attach the local stream to the video element
                                }}
                            />
                            <div className="absolute bottom-3 left-3 bg-background/80 px-2 py-1 rounded-md text-xs font-medium">
                                You
                            </div>
                            {/* Control buttons for mic and video */}
                            <div className="absolute top-[12rem] left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                                <Button
                                    variant={isMicOn ? "outline" : "destructive"}
                                    size="icon"
                                    onClick={toggleMic}
                                    className="rounded-full h-12 w-12 cursor-pointer"
                                >
                                    {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                                </Button>
                                <Button
                                    variant={isVideoOn ? "outline" : "destructive"}
                                    size="icon"
                                    onClick={toggleVideo}
                                    className="rounded-full h-12 w-12 cursor-pointer"
                                >
                                    {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                                </Button>
                            </div>
                        </div>
                    </Card>
                )
                }
                {/* Remote Videos */}
                {
                    remoteUsers.map((user) => (
                        <Card
                            key={user.id}
                            className="overflow-hidden z-40 bg-green-600 rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted shadow-sm"
                        >
                            <div className="relative aspect-video right-8  bg-black">
                                {user.stream ? (
                                    <video
                                        className="h-full w-full object-cover"
                                        autoPlay
                                        playsInline
                                        ref={(el) => {
                                            if (el) el.srcObject = user.stream; // Attach the remote stream to the video element
                                        }}
                                    />
                                ) : (
                                    // Show a placeholder if the stream isn’t available yet
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-muted-foreground">Waiting for {user.name}...</p>
                                    </div>
                                )}
                                <div className="absolute bottom-3 left-3 bg-background/80 px-2 py-1 rounded-md text-xs font-medium">
                                    {user.name}
                                </div>
                            </div>
                        </Card>
                    ))
                }
            </div >
        </div >
    );
};