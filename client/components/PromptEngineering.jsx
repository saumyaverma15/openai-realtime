import { useEffect, useState } from "react";

const functionDescription = `
Call this function when a user asks for a color palette.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_color_palette",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            theme: {
              type: "string",
              description: "Description of the theme for the color scheme.",
            },
            colors: {
              type: "array",
              description: "Array of five hex color codes based on the theme.",
              items: {
                type: "string",
                description: "Hex color code",
              },
            },
          },
          required: ["theme", "colors"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { theme, colors } = JSON.parse(functionCallOutput.arguments);

  const colorBoxes = colors.map((color) => (
    <div
      key={color}
      className="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
      style={{ backgroundColor: color }}
    >
      <p className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
        {color}
      </p>
    </div>
  ));

  return (
    <div className="flex flex-col gap-2">
      <p>Theme: {theme}</p>
      {colorBoxes}
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

export default function PromptEngineering({
    textbox1Value,
    setTextbox1Value,
    textbox2Value,
    setTextbox2Value,
    disclosureLevel,
    setDisclosureLevel,
    sendClientEvent,
    sendTextMessage,
    events,
    isSessionActive,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);
  const [persona, setPersona] = useState("You are a friendly assistant");
  const [audioEmotions, setAudioEmotions] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    // if (
    //   mostRecentEvent.type === "response.done" &&
    //   mostRecentEvent.response.output
    // ) {
    //   mostRecentEvent.response.output.forEach((output) => {
    //     if (
    //       output.type === "function_call" &&
    //       output.name === "display_color_palette"
    //     ) {
    //       setFunctionCallOutput(output);
    //       setTimeout(() => {
    //         sendClientEvent({
    //           type: "response.create",
    //           response: {
    //             instructions: `
    //             ask for feedback about the color palette - don't repeat 
    //             the colors, just ask if they like the colors.
    //           `,
    //           },
    //         });
    //       }, 500);
    //     }
    //   });
    // }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Prompt Engineering</h2>
        
        {/* Add Persona and Audio Emotions input fields */}
        {!isSessionActive && (
          <div className="mb-4">
            <label htmlFor="persona" className="block text-sm font-medium text-gray-700">
              Persona
            </label>
            <input
              id="textbox1"
              type="text"
              value={textbox1Value} 
              onChange={(e) => setTextbox1Value(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isSessionActive} 
            />
          </div>
        )}

        {!isSessionActive && (
          <div className="mb-4">
            <label htmlFor="audioEmotions" className="block text-sm font-medium text-gray-700">
              Audio Emotions
            </label>
            <input
              id="textbox2"
              type="text"
              value={textbox2Value}  
              onChange={(e) => setTextbox2Value(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isSessionActive} 
            />

            <p className="text-sm font-medium text-gray-700">Levels of Disclosure</p>
            <div className="flex gap-2">
                <button
                type="button"
                className={`px-4 py-2 rounded-md border ${disclosureLevel === "low" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setDisclosureLevel("low")}
                >
                Low
                </button>
                <button
                type="button"
                className={`px-4 py-2 rounded-md border ${disclosureLevel === "medium" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setDisclosureLevel("medium")}
                >
                Medium
                </button>
                <button
                type="button"
                className={`px-4 py-2 rounded-md border ${disclosureLevel === "high" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setDisclosureLevel("high")}
                >
                High
                </button>
                <button
                type="button"
                className={`px-4 py-2 rounded-md border ${disclosureLevel === "match" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setDisclosureLevel("match")}
                >
                Match User
                </button>
            </div>

          </div>
        )}


        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <p>Restart the session for prompt modifications...</p>
          )
        ) : (
          <p>Start the session to activate prompt modifications...</p>
        )}
      </div>
    </section>
  );
}
