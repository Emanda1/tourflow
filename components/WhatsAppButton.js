import { company } from "@/lib/config";

export default function WhatsAppButton() {
  const text = encodeURIComponent(`Hello ${company.name}, I'd like to ask about a trip.`);
  return (
    <a className="wa-float" href={`https://wa.me/${company.whatsapp}?text=${text}`} target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden><path fill="currentColor" d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.4.7 4.7 1.9 6.7L3 29l6.9-2.1c1.9 1 4 1.6 6.1 1.6 7 0 12.7-5.6 12.7-12.6S23 3 16 3zm0 23.1c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.2 1.3-4-.3-.4c-1.1-1.7-1.7-3.6-1.7-5.6 0-5.8 4.8-10.5 10.6-10.5s10.6 4.7 10.6 10.5S21.8 26.1 16 26.1zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.3c.2.2 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.3-.3-.4-.6-.5z"/></svg>
      <span>Chat with us</span>
    </a>
  );
}
