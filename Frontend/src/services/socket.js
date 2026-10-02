import { io } from "socket.io-client";
import { DEFAULT_SOCKET_URL } from "../config/deploymentDefaults";

const socket = io(
  import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL,
  {
    autoConnect: false,
    transports: ["websocket"],
  }
);

export default socket;