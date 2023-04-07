import pkg from "@next/env";
import fs from "fs";
import { Configuration, OpenAIApi } from "openai";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = pkg;

loadEnvConfig("");

const generateEmbeddings = async (content) => {
	const configuration = new Configuration({
		apiKey: process.env.OPENAI_API_KEY,
	});

	const openai = new OpenAIApi(configuration);

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_ROLE_KEY
	);

	for (const support of content) {
		for (const chunk of support.chunks) {
			const embeddingResponse = await openai.createEmbedding({
				model: "text-embedding-ada-002",
				input: chunk.content,
			});

			const [{ embedding }] = embeddingResponse.data.data;

			const { data, error } = await supabase
				.from("jp_support")
				.insert({
					title: chunk.title,
					url: chunk.url,
					content: chunk.content,
					content_tokens: chunk.tokens,
					embedding,
				})
				.select("*");

			if (error) {
				console.log(error);
			} else {
				console.log("saved ", chunk.url, chunk.tokens);
			}

			await new Promise((resolve) => setTimeout(resolve, 300));
		}
	}
};

(async () => {
	const json = JSON.parse(fs.readFileSync("content.json", "utf8"));
	await generateEmbeddings(json.content);
})();
