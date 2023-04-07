import { OpenAIStream } from "../../../utils";

export const config = {
	runtime: "edge",
};

const handler = async (req) => {
	try {
		const { prompt } = await req.json();
		const stream = await OpenAIStream(prompt);
		return new Response(stream, { status: 200 });
	} catch (error) {
		return new Response("Error", { status: 500 });
	}
};

export default handler;
