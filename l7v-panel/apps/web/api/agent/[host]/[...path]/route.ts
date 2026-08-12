import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ host: string; path: string[] }> }
) {
  const { host, path } = await params;
  const apiPath = `/${path.join("/")}`;

  // Unix socket path for the agent
  const socketPath = `/run/panel-agent/${host}.sock`;

  try {
    // Forward request to panel-agent via Unix socket
    const response = await fetch(`http://localhost${apiPath}`, {
      headers: {
        "X-Panel-Socket": socketPath,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Agent proxy error for ${host}:`, error);
    return NextResponse.json(
      { error: "Agent unavailable" },
      { status: 503 }
    );
  }
}
