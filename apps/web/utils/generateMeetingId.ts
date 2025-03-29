const characters = "abcdefghijklmnopqrstuvwxyz";

export const generateMeetingId = () => {

    const getRandomChar = () => characters.charAt(Math.floor(Math.random() * characters.length));

    return `${getRandomChar()}${getRandomChar()}${getRandomChar()}-${getRandomChar()}${getRandomChar()}${getRandomChar()}-${getRandomChar()}${getRandomChar()}${getRandomChar()}`;
};