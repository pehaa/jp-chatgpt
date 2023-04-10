const Results = ({ results }) => {
	return (
		<>
			{!!results.length && (
				<details className="mb-4">
					<summary>
						Best matching content sent as context (check console for more
						details)
					</summary>
					<ul className="list-group">
						{results.map((result, index) => {
							return (
								<li key={index} className="small list-group-item">
									<a href={result.url}>{result.title}</a> -{" "}
									<b>{result.section_title}</b> {result.content}
								</li>
							);
						})}
					</ul>
				</details>
			)}
		</>
	);
};

export default Results;
