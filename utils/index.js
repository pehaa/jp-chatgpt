import { createClient } from "@supabase/supabase-js";
import { createParser } from "eventsource-parser";
import { codeBlock, oneLine } from "common-tags";
import { ChatCompletionRequestMessageRoleEnum } from "openai";

export const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const OpenAIStream = async (query, contextText) => {
	const messages = [
		{
			role: ChatCompletionRequestMessageRoleEnum.System,
			content: codeBlock`
            ${oneLine`
              You are a very enthusiastic Jetpack AI who loves
              to help people! Given the following information from
              the Jetpack documentation, answer the user's question using
              only that information, outputted in markdown format.
            `}
  
            ${oneLine`
              If you are unsure
              and the answer is not explicitly written in the documentation, say
              "Sorry, I don't know how to help with that."
            `}
            
            ${oneLine`
              Include related code snippets if available.
            `}
          `,
		},
		{
			role: ChatCompletionRequestMessageRoleEnum.User,
			content: codeBlock`
            Here is the Jetpack documentation:
            ${contextText}
          `,
		},
		{
			role: ChatCompletionRequestMessageRoleEnum.User,
			content: codeBlock`
            ${oneLine`
              Answer my next question using only the above Jetpack documentation.
              You must also follow the below rules when answering:
            `}
            ${oneLine`
              - Do not make up answers that are not provided in the documentation.
            `}
            ${oneLine`
              - If you are unsure and the answer is not explicitly written
              in the documentation context, say
              "Sorry, I don't know how to help with that."
            `}
            ${oneLine`
              - Prefer splitting your response into multiple paragraphs.
            `}
            ${oneLine`
              - Do not add additional information that you are not asked for.
            `}
            ${oneLine`
              - Output as markdown with code snippets if available.
            `}
          `,
		},
		{
			role: ChatCompletionRequestMessageRoleEnum.User,
			content: codeBlock`
            Here is my question:
            ${oneLine`${query}`}
        `,
		},
	];

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
		},
		body: JSON.stringify({
			model: "gpt-3.5-turbo",
			messages,
			max_tokens: 512,
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
