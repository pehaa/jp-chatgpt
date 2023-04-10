import Head from "next/head";
import { useState } from "react";
import "bootstrap/dist/css/bootstrap.css";
import Answer from "@/components/Answer";
import Question from "@/components/Question";
import Loading from "@/components/Loading";
import Results from "@/components/Results";

export default function Home() {
	const [query, setQuery] = useState("");
	const [answer, setAnswer] = useState("");
	const [question, setQuestion] = useState("");
	const [previousAnswers, setPreviousAnswers] = useState([]);
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);

	const handleAnswer = async () => {
		setPreviousAnswers((prev) => [
			{ question, answer, results: [...results] },
			...prev,
		]);
		setLoading(true);
		setAnswer("");
		setResults([]);
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
		const response = await searchResponse.json();
		setResults(response);

		console.log("results", response);

		let tokenCount = 0;
		let contextText = "";

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			const content = result.content;
			tokenCount += result.content_tokens;

			if (tokenCount >= 1500) {
				break;
			}

			contextText += `${content.trim()}\n---\n`;
		}

		setQuery("");

		const answerResponse = await fetch("/api/answer", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query,
				contextText,
			}),
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
				<h1 className="mb-4 h4">GPT based on Jetpack Support Pages</h1>
				<div className="mb-4">
					<label htmlFor="question">Question:</label>
					<input
						id="question"
						type="text"
						className="form-control mb-3"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>

					<button
						type="button"
						className="btn btn-success"
						onClick={handleAnswer}
					>
						Submit
					</button>
				</div>
				<div>
					<Question question={question} />
					{loading ? (
						<Loading />
					) : (
						<>
							<Answer answer={answer} />
							<Results results={results} />
						</>
					)}
				</div>
				<hr />
				<section className="small">
					{previousAnswers.map(({ question, answer, results }, index) => {
						return (
							<div key={index}>
								<Question question={question} />
								<Answer answer={answer} />
								<Results results={results} />
							</div>
						);
					})}
				</section>
			</main>
			<footer className="container small">
				Resources:
				<ul>
					<li>
						<a
							href="https://www.youtube.com/watch?v=RM-v7zoYQo0"
							target="_blank"
						>
							How to create an OpenAI Q&A bot with ChatGPT API + embeddings
						</a>
					</li>
					<li>
						<a
							href="https://www.youtube.com/watch?v=Yhtjd7yGGGA"
							target="_blank"
						>
							ClippyGPT - How I Built Supabase’s OpenAI Doc Search (Embeddings)
						</a>
					</li>
				</ul>
				<div>
					<p>
						I scrapped pages from{" "}
						<a href="https://jetpack.com/sitemap-1.xml">
							https://jetpack.com/sitemap-1.xml
						</a>{" "}
						starting with <code>https://jetpack.com//support/</code>. I chunked
						them into sections based on headings. Next, I sent them to OpenAI to
						calculate embedding vectors and saved them in a{" "}
						<a href="https://supabase.com/">supabase </a>database.
					</p>
					<p>
						When the question is asked, it is sent to OpenAI to calculate the
						embedding vector. Then the query is sent to the database to find the
						10 best-matching chunks with a similarity threshold (cosine) of
						0.78.
					</p>
					<p>
						Then the results from database are sent to OpenAI as context
						(Jetpack documentation) together with question and rules.
					</p>
					<ul>
						<li>
							You are a very enthusiastic Jetpack AI who loves to help people!
							Given the following information from the Jetpack documentation,
							answer the user&lsquo;s question using only that information,
							outputted in markdown format. If you are unsure and the answer is
							not explicitly written in the documentation, say &quot;Sorry, I
							don&lsquo;t know how to help with that.&quot; Include related code
							snippets if available.{" "}
						</li>
						<li>
							Do not make up answers that are not provided in the documentation.
						</li>
						<li>
							Do not make up answers that are not provided in the documentation.
						</li>
						<li>Prefer splitting your response into multiple paragraphs.</li>
						<li>Output as markdown with code snippets if available. </li>
					</ul>
					<p>
						<b>
							Note that I asket GPT to rely solely on the provided context. It
							still sometimes "hallucinates'. Re-asking the same questions
							usually helps.
						</b>
					</p>
					<a href="https://github.com/pehaa/jp-chatgpt" target="_blank">
						GitHub repo
					</a>
				</div>
			</footer>
		</>
	);
}
