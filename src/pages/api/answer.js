import { OpenAIStream } from "../../../utils";

export const config = {
	runtime: "edge",
};

const handler = async (req) => {
	try {
		const { query, contextText } = await req.json();
		const stream = await OpenAIStream(query, contextText);
		return new Response(stream, { status: 200 });
	} catch (error) {
		console.log(error);
		return new Response("Error", { status: 500 });
	}
};

export default handler;
