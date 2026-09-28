import './style.css'

document.querySelector('#app').innerHTML = `
	<main class="app-shell">
		<header class="app-header">
			<h1>Dwelling</h1>
		</header>
		<div class="experience-layout">
			<section class="experience-panel" aria-labelledby="world-heading">
				<h2 id="world-heading">World</h2>
				<div id="world"></div>
			</section>
			<section class="experience-panel" aria-labelledby="chat-heading">
				<h2 id="chat-heading">Conversations</h2>
				<div id="chat"></div>
			</section>
		</div>
	</main>
`
