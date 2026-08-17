const apiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6Kx3t_NlDJF2EiuwFiNtL5j6cNf4z40deF7ZvAAamzpNA";

async function testBearerToken() {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  console.log("Testing with Authorization: Bearer header...");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: "Hey Maya, reply in one punchy, natural conversational sentence to a startup founder." }] }
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
    console.log("✅ Live Gemini 2.5 Flash Response:\n", data.candidates?.[0]?.content?.parts?.[0]?.text);
  } else {
    console.log("Error:", await res.text());
  }
}

testBearerToken();
