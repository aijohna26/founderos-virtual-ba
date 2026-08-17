/**
 * Test: AI Analyst Backend API Route Validation
 */

async function testAiAnalystApi() {
  const ports = [3000, 3001];
  let success = false;

  for (const port of ports) {
    try {
      console.log(`Checking http://localhost:${port}/api/ai-analyst...`);
      const response = await fetch(`http://localhost:${port}/api/ai-analyst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "What's our cheapest package and how should we price it?",
          venture: {
            name: "Peak Fitness",
            tagline: "High-intensity training & scientific recovery",
            stage: "Validation",
            targetCustomer: "Athletes in Boulder, CO",
            columns: {
              today: { name: "TODAY", items: [] },
              backlog: { name: "BACKLOG", items: [] }
            }
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`\n✅ Connected on port ${port}!`);
        console.log("AI Spoken Reply Sample:", data.reply?.slice(0, 150) + "...");
        console.log("Actions generated:", data.actions || []);
        success = true;
        break;
      }
    } catch (e) {
      console.log(`Port ${port} not reachable: ${e.message}`);
    }
  }

  if (!success) {
    console.log("Note: Development server might be on another port or starting up.");
  }
}

testAiAnalystApi();
