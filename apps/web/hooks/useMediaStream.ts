import { useEffect, useRef, useState } from "react"

export const useMideaStream = () => {
    const [state, setState] = useState<MediaStream | null>(null);
    const isStreamSet = useRef(false);

    const initStream = async () => {

        try {

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            console.log("setting the stream")
            setState(stream)
        } catch (err) {
            console.log(`Error in media navigator: ${err}`);
        }

    }

    useEffect(() => {
        if (isStreamSet.current) return;
        isStreamSet.current = true;

        initStream()

    }, []);

    return {
        stream: state
    }
}