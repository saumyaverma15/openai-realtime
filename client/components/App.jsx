import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";
import PromptEngineering from "./PromptEngineering";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [textbox1Value, setTextbox1Value] = useState("");
  const [textbox2Value, setTextbox2Value] = useState("");
  const [disclosureLevel, setDisclosureLevel] = useState(""); 



  async function startSession() {
    //const instructions = "You are very sassy to everyone."

    let disclosure = "";
    if (disclosureLevel === "low") {
      disclosure = "You should not be too open about your opinions and feelings. Do not reciporcate emotions or sentiments of the user. Restrict yourself to basic facts and information."
    } else if (disclosureLevel === "medium") {
      disclosure = "You should be somewhat open about your opinions and feelings. You can reciporcate emotions or sentiments of the user occasionally. Otherwise, restrict yourself to basic facts and information."
    } else if (disclosureLevel === "high") {
      disclosure = "You should be very open about your opinions and feelings. You can reciporcate emotions or sentiments of the user. Try to connect with the user on a personal level by providing personal anecdotes and experiences. Validate their feelings and pay attention to nuances in their speech."
    } else {
      // Disclosure is to match user
      disclosure = "You should match the user's disclosure level. If the user is being emotional and sharing their feelings, be very open about your opinions and feelings. You can reciporcate emotions or sentiments of the user. If they are distant and do not share much, restrict yourself to basic facts and information."
    }
    const instructions = `
      Your persona for this conversations is: ${textbox1Value}
      When speaking display the following emotions: ${textbox2Value}
      Additional instructions, regarding emotional disclosure: ${disclosure}
    `;
    const tokenResponse = await fetch(`/token?voice=${selectedVoice}&instruction=${instructions}`);
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}&voice=${selectedVoice}&instruction=${instructions}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  function handleVoiceSelection(voice) {
    setSelectedVoice(voice);
    //selectedVoice = voice;
  }

  function VoiceSelector({ handleVoiceSelection }) {
    const voices = ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse"]; // Replace with actual voice options
  
    return (
      <div className="voice-selector flex gap-4">
      {voices.map((voice) => (
        <button
          key={voice}
          className={`voice-button p-2 rounded-lg text-sm font-medium transition-colors 
            ${voice === selectedVoice ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} 
            hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          onClick={() => handleVoiceSelection(voice)}
          title={`Select the ${voice} voice`} // Tooltip on hover
        >
          {voice}
        </button>
      ))}
    </div>
    );
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        setEvents((prev) => [JSON.parse(e.data), ...prev]);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} />
          <h1>realtime console</h1>
        </div>
        <VoiceSelector handleVoiceSelection={handleVoiceSelection} />
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-[380px] bottom-0 flex">
          <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
            <EventLog events={events} />
          </section>
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
        
        {/* Tool Panel with Top and Bottom Parts */}
        <section className="absolute top-0 w-[375px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
          {/* Top half of the ToolPanel */}
          <div className="h-1/2 p-2">
            <PromptEngineering
              textbox1Value={textbox1Value}
              setTextbox1Value={setTextbox1Value}
              textbox2Value={textbox2Value}
              setTextbox2Value={setTextbox2Value}
              disclosureLevel={disclosureLevel}
              setDisclosureLevel={setDisclosureLevel}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
            />
          </div>
          
  
          {/* Bottom half of the ToolPanel */}
          <div className="h-1/2 p-2 mt-4">
            <ToolPanel
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
            />
          </div>
        </section>
      </main>
    </>
  );
}  