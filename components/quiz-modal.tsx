"use client"

// Quiz Modal Component
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, CheckCircle, XCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SelectedNode } from "@/components/remedy-panel"

interface QuizModalProps {
  isOpen: boolean
  onClose: () => void
  selectedNode: SelectedNode | null
}

const quizzes: Record<string, {
  title: string
  questions: {
    id: string
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }[]
}> = {
  "4": {
    title: "Determinants Quiz",
    questions: [
      {
        id: "1",
        question: "For a 2×2 matrix [[a,b],[c,d]], what is the determinant formula?",
        options: ["a + d - b - c", "ad - bc", "ac + bd", "ad + bc"],
        correctAnswer: 1,
        explanation: "The determinant of a 2×2 matrix [[a,b],[c,d]] is ad - bc.",
      },
      {
        id: "2",
        question: "What does a zero determinant indicate?",
        options: ["The matrix is invertible", "The matrix is singular (non-invertible)", "The matrix is orthogonal", "The matrix is symmetric"],
        correctAnswer: 1,
        explanation: "A zero determinant means the matrix is singular and does not have an inverse.",
      },
      {
        id: "3",
        question: "What is the determinant of the identity matrix?",
        options: ["0", "1", "-1", "n (dimension)"],
        correctAnswer: 1,
        explanation: "The determinant of the identity matrix I is always 1.",
      },
    ],
  },
  "10": {
    title: "Chain Rule Quiz",
    questions: [
      {
        id: "1",
        question: "If f(x) = (3x² + 1)⁵, what is f'(x)?",
        options: ["5(3x² + 1)⁴", "6x(3x² + 1)⁵", "30x(3x² + 1)⁴", "5(6x)"],
        correctAnswer: 2,
        explanation: "Using the chain rule: f'(x) = 5(3x² + 1)⁴ · 6x = 30x(3x² + 1)⁴",
      },
      {
        id: "2",
        question: "The chain rule states that d/dx[f(g(x))] equals:",
        options: ["f(x) · g(x)", "f'(x) + g'(x)", "f'(g(x)) · g'(x)", "f'(g(x)) + g'(x)"],
        correctAnswer: 2,
        explanation: "The chain rule: d/dx[f(g(x))] = f'(g(x)) · g'(x).",
      },
      {
        id: "3",
        question: "What is the derivative of sin(4x)?",
        options: ["sin(4)", "4cos(4x)", "cos(4x)", "-sin(4x)"],
        correctAnswer: 1,
        explanation: "d/dx[sin(4x)] = cos(4x) · 4 = 4cos(4x).",
      },
    ],
  },
}

function QuizModalContent({ isOpen, onClose, selectedNode }: QuizModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setCurrentQuestion(0)
      setSelectedAnswers([])
      setShowResults(false)
    }
  }, [isOpen, selectedNode?.id])

  if (!mounted || !isOpen || !selectedNode) return null

  const quizData = quizzes[selectedNode.id]
  
  const handleSelectAnswer = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = optionIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNextQuestion = () => {
    if (quizData && currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResults(true)
    }
  }

  const handleRetry = () => {
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setShowResults(false)
  }

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {!quizData ? (
          // Quiz Not Available
          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Quiz Not Available</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-muted-foreground mb-6">
              Quiz for this concept is coming soon!
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        ) : showResults ? (
          // Results Screen
          <div className="p-8 space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="text-center">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold",
                (selectedAnswers.filter((ans, idx) => ans === quizData.questions[idx].correctAnswer).length / quizData.questions.length) >= 0.7 
                  ? "bg-primary/20 text-primary" 
                  : "bg-amber-500/20 text-amber-600"
              )}>
                {Math.round((selectedAnswers.filter((ans, idx) => ans === quizData.questions[idx].correctAnswer).length / quizData.questions.length) * 100)}%
              </div>
              <h2 className="text-2xl font-bold text-foreground">Quiz Complete!</h2>
              <p className="text-muted-foreground mt-2">
                You got {selectedAnswers.filter((ans, idx) => ans === quizData.questions[idx].correctAnswer).length} out of {quizData.questions.length} correct
              </p>
            </div>

            <div className="space-y-3">
              {quizData.questions.map((q, idx) => (
                <div key={q.id} className={cn(
                  "p-3 rounded-lg border",
                  selectedAnswers[idx] === q.correctAnswer
                    ? "bg-primary/10 border-primary/50"
                    : "bg-destructive/10 border-destructive/50"
                )}>
                  <div className="flex items-start gap-3">
                    {selectedAnswers[idx] === q.correctAnswer ? (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{q.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedAnswers[idx] === q.correctAnswer ? "Correct!" : `Correct answer: ${q.options[q.correctAnswer]}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button onClick={handleRetry} className="flex-1">
                Retry Quiz
              </Button>
            </div>
          </div>
        ) : (
          // Quiz Questions
          <div className="overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{quizData.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Question {currentQuestion + 1} of {quizData.questions.length}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-4">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / quizData.questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">
                {quizData.questions[currentQuestion].question}
              </h3>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {quizData.questions[currentQuestion].options.map((option, idx) => {
                  const answered = selectedAnswers.length > currentQuestion
                  const isSelected = selectedAnswers[currentQuestion] === idx
                  const isCorrect = idx === quizData.questions[currentQuestion].correctAnswer
                  const showCorrect = answered && isCorrect
                  const showWrong = answered && isSelected && !isCorrect

                  return (
                    <button
                      key={idx}
                      onClick={() => !answered && handleSelectAnswer(idx)}
                      disabled={answered}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-all",
                        isSelected && !answered && "border-primary bg-primary/5",
                        showCorrect && "border-primary bg-primary/10",
                        showWrong && "border-destructive bg-destructive/10",
                        !isSelected && !answered && "border-border hover:border-primary/50 hover:bg-muted/50",
                        answered && !isSelected && !isCorrect && "opacity-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{option}</span>
                        {showCorrect && <CheckCircle className="h-5 w-5 text-primary" />}
                        {showWrong && <XCircle className="h-5 w-5 text-destructive" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Explanation */}
              {selectedAnswers.length > currentQuestion && (
                <div className={cn(
                  "p-4 rounded-xl border mb-6",
                  selectedAnswers[currentQuestion] === quizData.questions[currentQuestion].correctAnswer
                    ? "bg-primary/5 border-primary/30"
                    : "bg-amber-500/5 border-amber-600/30"
                )}>
                  <p className="text-sm text-foreground">{quizData.questions[currentQuestion].explanation}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  disabled={currentQuestion === 0}
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  className="flex-1"
                >
                  Previous
                </Button>
                <Button
                  disabled={selectedAnswers.length <= currentQuestion}
                  onClick={handleNextQuestion}
                  className="flex-1"
                >
                  {currentQuestion === quizData.questions.length - 1 ? "View Results" : "Next Question"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export function QuizModal(props: QuizModalProps) {
  return <QuizModalContent {...props} />
}
