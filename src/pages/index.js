import Head from "next/head";
import { Inter } from "next/font/google";
import { useState } from "react";
import endent from "endent";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
	const [query, setQuery] = useState("");
	const [answer, setAnswer] = useState("");
	const [chunks, setChunks] = useState([]);
	const [loading, setLoading] = useState(false);

	const handleAnswer = async () => {
		setLoading(true);
		const searchResponse = await fetch("/api/search", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query }),
		});

		if (!searchResponse.ok) {
			return;
		}
		const results = await searchResponse.json();
		setChunks(results);
		console.log(results);

		const prompt = endent`
    Answer the question based on the context below. Always use markdown syntax. If the question can't be answered based on the context, say "I don't know."

    
    Context: ${results.map((chunk) => chunk.content).join("\n")}

    Question: """
    ${query}
    """

    Answer as markdown (includind related code snippets if available):
    `;

		const answerResponse = await fetch("/api/answer", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ prompt }),
		});

		if (!answerResponse.ok) {
			setLoading(false);
			return;
		}

		const data = answerResponse.body;

		if (!data) {
			setLoading(false);
			return;
		}

		const reader = data.getReader();
		const decoder = new TextDecoder();

		let done = false;

		while (!done) {
			const { value, done: readerDone } = await reader.read();
			done = readerDone;
			const chunkValue = decoder.decode(value);
			setAnswer((prev) => prev + chunkValue);
		}

		setLoading(false);
	};

	return (
		<>
			<Head>
				<title>Jetpack Support Pages - GPT</title>
				<meta name="description" content="AI Q&A on Jetpack support pages" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<main>
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
				<button onClick={handleAnswer}>Submit</button>
				<div>{loading ? <div>Loading...</div> : <div>{answer}</div>}</div>
			</main>
		</>
	);
}
