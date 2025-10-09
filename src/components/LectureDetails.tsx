// src/components/LectureDetail.tsx
import React, { useState } from "react";
import { getLecturesBySubjectId, getSubjectById } from "../lib/mockData";

interface LectureDetailProps {
  sidebarCollapsed: boolean;
  lectureId: string;
  subjectId: string;
  onBack: () => void;
}

type Tab = "transcription" | "translation" | "notes";

// Mock transcription/translation data
const mockTranscription = `Welcome to today's lecture on Neural Networks. We'll be covering the fundamentals of how neural networks work, starting with the basic perceptron model.

A perceptron is the simplest form of a neural network. It takes multiple inputs, applies weights to them, sums them up, and passes the result through an activation function. This is the building block of more complex networks.

The key components are:
- Input layer: receives the raw data
- Weights: determine the importance of each input
- Activation function: introduces non-linearity
- Output: the final prediction or classification

Let's dive deeper into how backpropagation works. Backpropagation is the algorithm used to train neural networks by adjusting the weights based on the error in predictions.

The process involves:
1. Forward pass: compute predictions
2. Calculate loss: measure error
3. Backward pass: compute gradients
4. Update weights: adjust based on gradients

This iterative process continues until the network converges to an optimal solution. Modern deep learning frameworks like TensorFlow and PyTorch automate much of this process.

In our next session, we'll implement a simple neural network from scratch to see these concepts in action.`;

const mockTranslation = `Bienvenue à la conférence d'aujourd'hui sur les réseaux de neurones. Nous allons couvrir les principes fondamentaux du fonctionnement des réseaux de neurones, en commençant par le modèle de perceptron de base.

Un perceptron est la forme la plus simple d'un réseau de neurones. Il prend plusieurs entrées, leur applique des poids, les additionne et fait passer le résultat à travers une fonction d'activation. C'est la brique de base des réseaux plus complexes.

Les composants clés sont:
- Couche d'entrée: reçoit les données brutes
- Poids: déterminent l'importance de chaque entrée
- Fonction d'activation: introduit la non-linéarité
- Sortie: la prédiction ou classification finale

Approfondissons le fonctionnement de la rétropropagation. La rétropropagation est l'algorithme utilisé pour entraîner les réseaux de neurones en ajustant les poids en fonction de l'erreur dans les prédictions.

Le processus comprend:
1. Passe avant: calculer les prédictions
2. Calculer la perte: mesurer l'erreur
3. Passe arrière: calculer les gradients
4. Mettre à jour les poids: ajuster en fonction des gradients

Ce processus itératif se poursuit jusqu'à ce que le réseau converge vers une solution optimale. Les frameworks modernes d'apprentissage profond comme TensorFlow et PyTorch automatisent une grande partie de ce processus.

Dans notre prochaine session, nous implémenterons un réseau de neurones simple à partir de zéro pour voir ces concepts en action.`;

const mockNotes = `## Key Concepts

### Perceptron
- Simplest neural network unit
- Multiple inputs → weighted sum → activation → output
- Binary classification originally

### Backpropagation
- Training algorithm for neural networks
- Uses chain rule to compute gradients
- Essential for deep learning

### Important Formulas
- Weighted sum: z = Σ(wi × xi) + b
- Sigmoid activation: σ(z) = 1 / (1 + e^(-z))
- MSE Loss: L = (1/n) × Σ(y - ŷ)²

## TODO
- [ ] Review gradient descent variations
- [ ] Implement perceptron in Python
- [ ] Study activation function alternatives

## Questions
1. Why do we need non-linear activation functions?
2. How does learning rate affect convergence?
3. What's the difference between batch and stochastic gradient descent?`;

export default function LectureDetail({
  sidebarCollapsed,
  lectureId,
  subjectId,
  onBack,
}: LectureDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("transcription");
  
  // Find the lecture
  const lectures = getLecturesBySubjectId(subjectId);
  const lecture = lectures.find(l => l.id === lectureId);
  const subject = getSubjectById(subjectId);

  if (!lecture || !subject) {
    return (
      <div style={{ padding: 48, flex: 1 }}>
        <h2>Lecture not found</h2>
        <button onClick={onBack}>Back</button>
      </div>
    );
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getTabContent(): string {
    switch (activeTab) {
      case "transcription":
        return mockTranscription;
      case "translation":
        return mockTranslation;
      case "notes":
        return mockNotes;
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "transcription", label: "Transcription", icon: "📝" },
    { id: "translation", label: "Translation", icon: "🌐" },
    { id: "notes", label: "Notes", icon: "📋" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", flex: 1 }}>
      {/* Main content area */}
      <section
        style={{
          flex: 1,
          background: "#fafafa",
          overflowY: "auto",
          padding: sidebarCollapsed
            ? "48px 24px 24px 24px"
            : "48px 56px 24px 48px",
          transition: "padding 0.2s",
        }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#666",
            background: "transparent",
            border: "none",
            fontSize: "0.95rem",
            fontWeight: 500,
            marginBottom: 24,
            cursor: "pointer",
            padding: "4px 0",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#222")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#666")}
        >
          <span style={{ fontSize: 20 }}>←</span>
          Back to {subject.name}
        </button>

        {/* Lecture header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: "0.9rem",
              color: "#2563eb",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {subject.code} · {subject.name}
          </div>
          <h1
            style={{
              fontWeight: 700,
              fontSize: "2.3rem",
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            {lecture.title}
          </h1>

          {/* Metadata row */}
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              color: "#666",
              fontSize: "0.95rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>📅</span>
              {formatDate(lecture.date)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>⏱️</span>
              {lecture.duration}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>📄</span>
              {lecture.wordCount} words
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <button
            style={{
              padding: "10px 18px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "#1d4ed8")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "#2563eb")
            }
          >
            📥 Export
          </button>
          <button
            style={{
              padding: "10px 18px",
              background: "#fff",
              color: "#222",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#f5f5f5";
              e.currentTarget.style.borderColor = "#bbb";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#ddd";
            }}
          >
            ✏️ Edit
          </button>
          <button
            style={{
              padding: "10px 18px",
              background: "#fff",
              color: "#222",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#f5f5f5";
              e.currentTarget.style.borderColor = "#bbb";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#ddd";
            }}
          >
            🔗 Share
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            borderBottom: "2px solid #e5e5e5",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 20px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? "3px solid #2563eb"
                    : "3px solid transparent",
                color: activeTab === tab.id ? "#2563eb" : "#666",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: -2,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseOver={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = "#222";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = "#666";
                }
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: activeTab === "notes" ? 32 : 40,
            minHeight: 500,
            maxWidth: 900,
            lineHeight: 1.8,
            fontSize: "1.05rem",
            color: "#222",
            whiteSpace: "pre-wrap",
          }}
        >
          {getTabContent()}
        </div>
      </section>

      {/* Right sidebar for glossary/metadata */}
      <aside
        style={{
          width: 320,
          background: "#fff",
          borderLeft: "1px solid #eee",
          padding: "48px 24px 24px 24px",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: "1.1rem",
            marginBottom: 20,
          }}
        >
          📚 Glossary
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.95rem",
                marginBottom: 4,
                color: "#2563eb",
                cursor: "pointer",
              }}
            >
              Perceptron
            </div>
            <div style={{ fontSize: "0.9rem", color: "#666" }}>
              The simplest form of a neural network unit
            </div>
          </div>

          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.95rem",
                marginBottom: 4,
                color: "#2563eb",
                cursor: "pointer",
              }}
            >
              Backpropagation
            </div>
            <div style={{ fontSize: "0.9rem", color: "#666" }}>
              Algorithm for training neural networks using gradient descent
            </div>
          </div>

          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.95rem",
                marginBottom: 4,
                color: "#2563eb",
                cursor: "pointer",
              }}
            >
              Activation Function
            </div>
            <div style={{ fontSize: "0.9rem", color: "#666" }}>
              Introduces non-linearity into the neural network
            </div>
          </div>

          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.95rem",
                marginBottom: 4,
                color: "#2563eb",
                cursor: "pointer",
              }}
            >
              Gradient Descent
            </div>
            <div style={{ fontSize: "0.9rem", color: "#666" }}>
              Optimization algorithm to minimize loss function
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid #eee",
          }}
        >
          <h3
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              marginBottom: 16,
            }}
          >
            🔖 Key Timestamps
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                fontSize: "0.9rem",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              <div style={{ color: "#2563eb", fontWeight: 600 }}>00:00</div>
              <div style={{ color: "#666" }}>Introduction</div>
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              <div style={{ color: "#2563eb", fontWeight: 600 }}>05:23</div>
              <div style={{ color: "#666" }}>Perceptron basics</div>
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              <div style={{ color: "#2563eb", fontWeight: 600 }}>12:45</div>
              <div style={{ color: "#666" }}>Backpropagation explained</div>
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              <div style={{ color: "#2563eb", fontWeight: 600 }}>28:10</div>
              <div style={{ color: "#666" }}>Modern frameworks</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
