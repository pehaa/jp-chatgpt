import { createClient } from "@supabase/supabase-js";
import { createParser } from "eventsource-parser";

export const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const OpenAIStream = async (prompt) => {
	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
		},
		body: JSON.stringify({
			model: "gpt-3.5-turbo",
			messages: [
				{
					role: "system",
					content:
						"You are a helpful assistant that aswer questions about Jetpack.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			max_tokens: 150,
			temperature: 0,
			stream: true,
		}),
	});

	if (response.status !== 200) {
		throw new Error("Error");
	}

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const stream = new ReadableStream({
		async start(controller) {
			const onParse = (event) => {
				const data = event.data;
				if (data === "[DONE]") {
					controller.close();
					return;
				}

				try {
					const json = JSON.parse(data);
					const text = json.choices[0].delta.content;
					const queue = encoder.encode(text);
					controller.enqueue(queue);
				} catch (e) {
					controller.error(e);
				}
			};

			const parser = createParser(onParse);

			for await (const chunk of response.body) {
				parser.feed(decoder.decode(chunk));
			}
		},
	});
	return stream;
};
