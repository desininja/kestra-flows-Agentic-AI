import { NextResponse } from 'next/server';

export async function POST(request) {
  const { question } = await request.json();

  // Configuration matching your Kestra Flow ID and Namespace
  const flowId = "nada-agentic-pipeline"; 
  const namespace = "hackathon.agent";
  
  // We send the input as "multipart/form-data" because Kestra inputs work best this way
  const formData = new FormData();
  formData.append("user_question", question); 

  try {
    const response = await fetch(
      `${process.env.KESTRA_API_URL}/api/v1/executions/${namespace}/${flowId}`,
      {
        method: 'POST',
        headers: {
          // If you have auth, it inserts it here. Otherwise it sends empty string (fine for local)
          ...(process.env.KESTRA_BASIC_AUTH_HEADER && { 'Authorization': process.env.KESTRA_BASIC_AUTH_HEADER })
        },
        body: formData 
      }
    );

    if (!response.ok) {
      throw new Error(`Kestra error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ executionId: data.id });
    
  } catch (error) {
    console.error("Trigger Error:", error);
    return NextResponse.json({ error: "Failed to start AI Agent" }, { status: 500 });
  }
}