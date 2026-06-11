import { useEffect, useState } from "react";
import { getAuthHeaders } from "../auth";

function getRouteMeta(pathname) {
  switch (pathname) {
    case "/app/dashboard":
      return {
        label: "Dashboard",
        prompt: "Ask about risk share, top ports, or the active Neural Network model with Random Forest comparison.",
        suggestions: [
          "What does this page show?",
          "Summarize the most important dashboard insights.",
          "Which model looks strongest here and why?",
        ],
      };
    case "/app/dataset":
      return {
        label: "Dataset",
        prompt: "Ask about data quality, features, top ports, or risk distribution.",
        suggestions: [
          "Summarize this dataset in simple words.",
          "Which features look most important here?",
          "What should I say about data quality in the presentation?",
        ],
      };
    case "/app/prediction":
      return {
        label: "Prediction Lab",
        prompt: "Ask how the Neural Network prediction flow works or what the benchmarks mean.",
        suggestions: [
          "How does this prediction page use the model?",
          "What do the shipment feature summaries mean here?",
          "Explain this page like I am presenting it.",
        ],
      };
    case "/app/testing-lab":
      return {
        label: "Mini Testing Lab",
        prompt: "Ask how the games connect to the models and dataset.",
        suggestions: [
          "How is this lab using the algorithms?",
          "Explain the Risk Runner in presentation language.",
          "What is the learning purpose of these mini games?",
        ],
      };
    case "/app/risk-map":
      return {
        label: "Risk Map",
        prompt: "Ask what this page shows and whether it is static or connected.",
        suggestions: [
          "Is this page connected to the backend yet?",
          "How should I explain this risk map honestly?",
          "What would need to happen to make this page live?",
        ],
      };
    case "/app/models/neural-network":
      return {
        label: "Neural Network Model",
        prompt: "Ask about the current status of this page and what is missing.",
        suggestions: [
          "Is this neural network page fully connected?",
          "How should I describe this page in the demo?",
          "What is still missing here?",
        ],
      };
    case "/app/models/random-forest":
      return {
        label: "Random Forest Model",
        prompt: "Ask about Random Forest metrics, the confusion matrix, or how it compares with the other models.",
        suggestions: [
          "What does this Random Forest page show?",
          "How should I explain the Random Forest performance?",
          "Why does this model matter in the comparison?",
        ],
      };
    case "/app/models/svm":
      return {
        label: "SVM Model",
        prompt: "Ask about SVM metrics, the confusion matrix, or why this model behaves the way it does.",
        suggestions: [
          "What does this SVM page show?",
          "How should I explain the SVM performance?",
          "Why is precision so low here?",
        ],
      };
    default:
      return {
        label: "Project Assistant",
        prompt: "Ask about the current project page.",
        suggestions: [
          "What can you tell me about this page?",
          "Summarize the important points here.",
          "What should I say if I present this page?",
        ],
      };
  }
}

function buildIntroMessage(pathname) {
  const routeMeta = getRouteMeta(pathname);

  return {
    role: "assistant",
    content: `I'm your project assistant for ${routeMeta.label}. ${routeMeta.prompt} I only answer questions about the Import Risk Analysis System project.`,
  };
}

function AIAssistantWidget({ pathname }) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([buildIntroMessage(pathname)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assistantConfig, setAssistantConfig] = useState({
    configured: true,
    model: "project-assistant",
    mode: "local-project-context",
  });

  const routeMeta = getRouteMeta(pathname);

  useEffect(() => {
    let isMounted = true;

    async function loadAssistantConfig() {
      try {
        const response = await fetch("/api/assistant/config", {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Project assistant could not be loaded.");
        }

        const data = await response.json();
        if (isMounted) {
          setAssistantConfig({
            configured: Boolean(data.configured),
            model: data.model || "project-assistant",
            mode: data.mode || "local-project-context",
          });
          setMessages([buildIntroMessage(pathname)]);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message);
        }
      }
    }

    loadAssistantConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setMessages([buildIntroMessage(pathname)]);
    setQuestion("");
    setError("");
  }, [pathname]);

  const submitQuestion = async (nextQuestion) => {
    const trimmedQuestion = String(nextQuestion || "").trim();
    if (!trimmedQuestion || loading) {
      return;
    }

    const nextUserMessage = {
      role: "user",
      content: trimmedQuestion,
    };
    const nextHistory = [...messages, nextUserMessage];

    setMessages(nextHistory);
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          route: pathname,
          question: trimmedQuestion,
          history: nextHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Assistant request failed.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch (requestError) {
      setError(requestError.message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I couldn't answer that just now. Please make sure the backend is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="ai-assistant-fab"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="ai-assistant-panel"
      >
        <strong>AI CHAT</strong>
      </button>

      {isOpen && (
        <section
          className="ai-assistant-panel"
          id="ai-assistant-panel"
          aria-label="AI assistant"
        >
          <div className="ai-assistant-header">
            <div>
              <span>Project Assistant</span>
              <strong>{routeMeta.label}</strong>
              <small>
                {assistantConfig.mode === "local-project-context"
                  ? "Built from project page context"
                  : `Using ${assistantConfig.model}`}
              </small>
            </div>

            <button
              type="button"
              className="ai-assistant-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI assistant"
            >
              x
            </button>
          </div>

          <div className="ai-assistant-suggestions">
            {routeMeta.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="ai-assistant-chip"
                onClick={() => submitQuestion(suggestion)}
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="ai-assistant-messages">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`ai-assistant-message ai-assistant-message-${message.role}`}
              >
                <span>{message.role === "assistant" ? "Assistant" : "You"}</span>
                <p>{message.content}</p>
              </div>
            ))}

            {loading && (
              <div className="ai-assistant-message ai-assistant-message-assistant">
                <span>Assistant</span>
                <p>Reviewing the current project page...</p>
              </div>
            )}
          </div>

          {error && <div className="ai-assistant-error">{error}</div>}

          <form
            className="ai-assistant-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitQuestion(question);
            }}
          >
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={`Ask about ${routeMeta.label.toLowerCase()}...`}
              rows="3"
            />

            <button className="primary-button ai-assistant-send" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </section>
      )}
    </>
  );
}

export default AIAssistantWidget;
