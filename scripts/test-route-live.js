const apiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6Kx3t_NlDJF2EiuwFiNtL5j6cNf4z40deF7ZvAAamzpNA";

async function testLiveConversation() {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: "You are Maya, an expert startup co-pilot. Answer naturally and concisely like a human in 1-2 spoken sentences." }]
      },
      contents: [
        { role: "user", parts: [{ text: "Hey Maya, what do you mean when you say we should test our core hypothesis?" }] }
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 250
      }
    })
  });

  console.log("Status:", res.status);
  if (res.ok) {
    const data = await res.json();
    console.log("Live Gemini 2.5 Flash Response:\n", data.candidates?.[0]?.content?.parts?.[0]?.text);
  } else {
    console.log("Error:", await res.text());
  }
}

testLiveConversation();
