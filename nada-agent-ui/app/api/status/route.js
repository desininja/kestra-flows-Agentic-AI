import { NextResponse } from 'next/server';

// Force Next.js to not cache this route
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('id');

  if (!executionId) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

  // Prepare headers (Authorization)
  const headers = {
    'Content-Type': 'application/json',
    ...(process.env.KESTRA_BASIC_AUTH_HEADER && { 'Authorization': process.env.KESTRA_BASIC_AUTH_HEADER })
  };

  try {
    // 1. Check Execution Status
    const statusRes = await fetch(
      `${process.env.KESTRA_API_URL}/api/v1/executions/${executionId}`,
      { method: 'GET', cache: 'no-store', headers }
    );
    
    if (!statusRes.ok) return NextResponse.json({ status: "RUNNING" }); // Fallback if API hiccups

    const statusData = await statusRes.json();
    const state = statusData.state.current;

    if (state === "SUCCESS") {
      // ---------------------------------------------------------
      // STRATEGY: Read the Logs instead of the Output File
      // ---------------------------------------------------------
      const logsRes = await fetch(
        `${process.env.KESTRA_API_URL}/api/v1/logs/${executionId}`,
        { method: 'GET', cache: 'no-store', headers }
      );
      
      const logs = await logsRes.json();

      // Filter for logs specifically from our analysis task
      const taskLogs = logs.filter(l => l.taskId === 'final_gemini_analysis');

      // Join all log messages into one big string
      const fullLogText = taskLogs.map(l => l.message).join('\n');

      // Define the marker we put in the Python script
      const marker = "--- Gemini's Final Answer ---";
      
      if (fullLogText.includes(marker)) {
        // Extract everything AFTER the marker
        const finalAnswer = fullLogText.split(marker)[1].trim();
        return NextResponse.json({ status: "SUCCESS", answer: finalAnswer });
      } else {
        return NextResponse.json({ 
            status: "SUCCESS", 
            answer: "Job finished, but couldn't find the answer in the logs. Check Kestra UI." 
        });
      }

    } else if (state === "FAILED" || state === "KILLED" || state === "WARNING") {
      return NextResponse.json({ status: "FAILED" });
    } else {
      return NextResponse.json({ status: "RUNNING" });
    }

  } catch (error) {
    console.error("Status Check Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}