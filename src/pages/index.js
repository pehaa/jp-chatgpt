import Head from "next/head";
import { useState } from "react";
import endent from "endent";
import "bootstrap/dist/css/bootstrap.css";
import Answer from "@/components/Answer";
import Question from "@/components/Question";

export default function Home() {
	const [query, setQuery] = useState("");
	const [answer, setAnswer] = useState("");
	const [question, setQuestion] = useState("");
	const [previousAnswers, setPreviousAnswers] = useState([]);
	const [chunks, setChunks] = useState([]);
	const [loading, setLoading] = useState(false);

	const handleAnswer = async () => {
		setPreviousAnswers((prev) => [{ question, answer }, ...prev]);
		setLoading(true);
		setAnswer("");
		setQuery("");
		setQuestion(query);
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
    Answer the question based on the context below. Your answer must be based on the context, otherwise say "I don't know."

    
    Context: ${results.map((chunk) => chunk.content).join("\n")}

    Question: """
    ${question}
    """

    Answer as markdown (if there is a code snippet include it in the answer):
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
			<main className="container py-4">
				<div className="mb-4">
					<label htmlFor="question">Question</label>
					<input
						id="question"
						type="text"
						className="form-control mb-3"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>

					<button
						type="button"
						className="btn btn-primary"
						onClick={handleAnswer}
					>
						Submit
					</button>
				</div>
				<div>
					<Question question={question} />
					{loading ? <div>Loading...</div> : <Answer answer={answer} />}
				</div>
				<section className="small">
					{previousAnswers.map(({ question, answer }, index) => {
						return (
							<div key={index}>
								<Question question={question} />
								<Answer answer={answer} />
							</div>
						);
					})}
				</section>
			</main>
		</>
	);
}
