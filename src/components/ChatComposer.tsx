import { Send } from "lucide-react";
import { useState } from "react";

type ChatComposerProps = {
    disabled: boolean;
    onSend: (message: string) => Promise<void>;
};

export function ChatComposer({ disabled, onSend }: ChatComposerProps) {
    const [value, setValue] = useState("");
    const [error, setError] = useState("");

    const submit = async () => {
        if (disabled || !value.trim()) return;
        setError("");
        try {
            await onSend(value);
            setValue("");
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : "The message could not be sent.");
        }
    };

    return <div className="chat-composer">{error ? <p className="chat-send-error">{error}</p> : null}<textarea onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Write a message..." value={value} /><button aria-label="Send message" className="primary-button" disabled={disabled || !value.trim()} onClick={() => void submit()} type="button"><Send size={15} /></button></div>;
}
