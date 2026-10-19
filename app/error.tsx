"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="page-container"><div className="empty-state"><h1>We’ll be right back.</h1><p>We couldn’t load this page. Please try again shortly.</p><button className="button-dark" onClick={reset}>Try again</button></div></main>}
