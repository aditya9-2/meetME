import React from 'react'

interface ChatPannelProps {
    roomId: string;
}

const ChatPannel = ({ roomId }: ChatPannelProps) => {
    return (
        <div>ChatPannel {roomId}</div>
    )
}

export default ChatPannel