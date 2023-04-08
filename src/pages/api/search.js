import { supabaseAdmin } from "../../../utils";

export const config = {
	runtime: "edge",
};

const handler = async (req) => {
	try {
		const { query } = await req.json();
		const response = await fetch("https://api.openai.com/v1/embeddings", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: "text-embedding-ada-002",
				input: query,
			}),
		});
		const { data } = await response.json();
		const embedding = data[0].embedding;

		const { data: chunks, error } = await supabaseAdmin.rpc("jp_search", {
			query_embedding: embedding,
			similarity_threshold: 0.01,
			match_count: 5,
		});
		if (error) {
			console.log(error);
			return new Response("Error", { status: 500 });
		}
		return new Response(JSON.stringify(chunks), { status: 200 });
	} catch (error) {
		return new Response("Error", { status: 500 });
	}
};

export default handler;