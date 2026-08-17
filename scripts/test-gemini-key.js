const apiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6Kx3t_NlDJF2EiuwFiNtL5j6cNf4z40deF7ZvAAamzpNA";

async function testGemini() {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
  ];

  console.log("Testing Gemini API Key with models...");

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Say a quick, natural one-sentence greeting to a startup founder." }] }]
        })
      });

      console.log(`Model: ${model} -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Response:", data.candidates?.[0]?.content?.parts?.[0]?.text);
      } else {
        const err = await res.text();
        console.log("Error details:", err.slice(0, 120));
      }
    } catch (e) {
      console.log(`Failed for ${model}:`, e.message);
    }
  }
}

testGemini();
