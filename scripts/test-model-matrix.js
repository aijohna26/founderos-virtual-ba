const apiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6Kx3t_NlDJF2EiuwFiNtL5j6cNf4z40deF7ZvAAamzpNA";

async function checkModels() {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-3-flash",
    "gemini-3-pro",
    "gemini-3.0-flash",
    "gemini-3.1-flash"
  ];

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Hello, reply in 3 words." }] }]
        })
      });
      console.log(`Model: ${m} -> Status: ${res.status}`);
      if (res.ok) {
        const d = await res.json();
        console.log(" -> Text:", d.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      }
    } catch (e) {
      console.log(`Error on ${m}:`, e.message);
    }
  }
}

checkModels();
