/* create Answer component */

import { ReactMarkdown } from "react-markdown/lib/react-markdown";

const Answer = ({ answer }) => {
	return <div>{answer && <ReactMarkdown>{answer}</ReactMarkdown>}</div>;
};

export default Answer;
