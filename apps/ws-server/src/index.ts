import "dotenv/config"
import cors from "cors";
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8080;

interface User {
    ws: WebSocket
    rooms: string[];
    userId: string;
}

enum Device {
    Microphone = "microphone",
    Camera = "camera"
}

enum State {
    On = "on",
    Off = "off",
}


const users: User[] = [];

wss.on('connection', function connection(ws) {

    ws.on('message', function message(data: string | Buffer) {
        try {
            const parsedData = JSON.parse(data.toString());

            if (parsedData.type === "JOIN_MEETING") {

                const { roomId, userId, name } = parsedData.payload;

                const user = users.find(u => u.userId === userId);

                if (!user) {

                    users.push({
                        userId,
                        rooms: [roomId],
                        ws
                    });

                } else {
                    if (!user.rooms.includes(roomId)) {

                        user.rooms.push(roomId);
                    }
                }

                users.forEach(u => {
                    if (u.rooms.includes(roomId) && u.ws !== ws) {
                        u.ws.send(JSON.stringify({
                            type: "USER_JOINED",
                            payload: { roomId, userId, name }
                        }));
                    }
                });

                ws.send(JSON.stringify({
                    type: "JOIN_SUCCESS",
                    roomId
                }));
            }

            if (parsedData.type === "LEAVE_MEETING") {

                const { roomId, userId } = parsedData.payload;

                const findUser = users.find(u => u.ws === ws);

                if (!findUser) return;

                findUser.rooms = findUser.rooms.filter(rId => rId !== roomId);

                // Remove user from `users` if they have no more rooms
                if (findUser.rooms.length === 0) {
                    const index = users.findIndex(u => u.userId === userId);
                    if (index !== -1) {
                        users.splice(index, 1);
                    }
                }

                users.forEach(u => {
                    if (u.rooms.includes(roomId) && u.ws !== ws) {
                        u.ws.send(JSON.stringify({
                            type: "USER_LEFT",
                            payload: { roomId, userId }
                        }));
                    }
                });
            }

            if (parsedData.type === "SEND_MESSAGE") {

                const { roomId, userId, message } = parsedData.payload

                users.forEach(u => {
                    if (u.rooms.includes(roomId)) {

                        u.ws.send(JSON.stringify({
                            type: "MESSAGE",
                            payload: { roomId, userId, message }
                        }));
                    }
                })
            }

            if (parsedData.type === "TOGGLE_DEVICE") {
                const { roomId, userId, device, state } = parsedData.payload;

                if (!Object.values(Device).includes(device) || !Object.values(State).includes(state)) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Invalid device or state"
                    }));
                    return;
                }

                users.forEach(u => {
                    if (u.rooms.includes(roomId)) {
                        u.ws.send(JSON.stringify({
                            type: "DEVICE_TOGGLED",
                            payload: { roomId, userId, device, state }
                        }));
                    }
                })
            }

            if (parsedData.type === "RAISE_HAND") {

                const { roomId, userId, raised } = parsedData.payload;

                if (typeof raised !== "boolean") {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Invalid state"
                    }));
                    return;
                }

                users.forEach(u => {
                    if (u.rooms.includes(roomId)) {
                        u.ws.send(JSON.stringify({
                            type: "HAND_RAISED",
                            payload: { roomId, userId, raised }
                        }));
                    }
                });

            }


        } catch (error) {

            console.error("Error processing message:", error);
            console.log("Received invalid data:", data.toString());

            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid JSON format"
            }));

        }
    });

    ws.send(JSON.stringify({ type: "CONNECTED", message: "WebSocket connected" }));
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});