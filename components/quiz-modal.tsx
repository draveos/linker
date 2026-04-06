"use client"

import { useState } from "react"
import { X, CheckCircle, XCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SelectedNode } from "@/app/page"

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
        explanation: "The determinant of a 2×2 matrix [[a,b],[c,d]] is ad - bc, which represents the product of the diagonal minus the product of the anti-diagonal.",
      },
      {
        id: "2",
        question: "What does a zero determinant indicate?",
        options: ["The matrix is invertible", "The matrix is singular (non-invertible)", "The matrix is orthogonal", "The matrix is symmetric"],
        correctAnswer: 1,
        explanation: "A zero determinant means the matrix is singular and does not have an inverse. It also indicates that the rows/columns are linearly dependent.",
      },
      {
        id: "3",
        question: "What is the determinant of the identity matrix?",
        options: ["0", "1", "-1", "n (dimension)"],
        correctAnswer: 1,
        explanation: "The determinant of the identity matrix I is always 1, regardless of its dimension.",
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
        explanation: "The chain rule: d/dx[f(g(x))] = f'(g(x)) · g'(x). You multiply the derivative of the outer function by the derivative of the inner function.",
      },
      {
        id: "3",
        question: "What is the derivative of sin(4x)?",
        options: ["sin(4)", "4cos(4x)", "cos(4x)", "-sin(4x)"],
        correctAnswer: 1,
        explanation: "d/dx[sin(4x)] = cos(4x) · 4 = 4cos(4x). The outer derivative is cos(4x), and the inner derivative is 4.",
      },
    ],
  },
}

export function QuizModal({ isOpen, onClose, selectedNode }: QuizModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)

  if (!isOpen || !selectedNode) return null

  const quizData = quizzes[selectedNode.id]
  if (!quizData) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Quiz Not Available</h2>
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
      </div>
    )
  }

  const question = quizData.questions[currentQuestion]
  const answered = selectedAnswers.length > currentQuestion
  const score = selectedAnswers.filter((ans, idx) => ans === quizData.questions[idx].correctAnswer).length

  const handleSelectAnswer = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = optionIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < quizData.questions.length - 1) {
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

  if (showResults) {
    const percentage = Math.round((score / quizData.questions.length) * 100)
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 space-y-6">
          <div className="text-center">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold",
              percentage >= 70 ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-600"
            )}>
              {percentage}%
            </div>
            <h2 className="text-2xl font-bold">Quiz Complete!</h2>
            <p className="text-muted-foreground mt-2">
              You got {score} out of {quizData.questions.length} questions correct
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
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{quizData.title}</h2>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {quizData.questions.length}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / quizData.questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-6">{question.question}</h3>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswers[currentQuestion] === idx
              const isCorrect = idx === question.correctAnswer
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
                    !isSelected && !answered && "border-border hover:border-primary/50",
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
          {answered && (
            <div className={cn(
              "mt-6 p-4 rounded-xl border",
              selectedAnswers[currentQuestion] === question.correctAnswer
                ? "bg-primary/5 border-primary/30"
                : "bg-amber-500/5 border-amber-600/30"
            )}>
              <p className="text-sm text-foreground">{question.explanation}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={currentQuestion === 0 || !answered}
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            className="flex-1"
          >
            Previous
          </Button>
          <Button
            disabled={!answered}
            onClick={handleNextQuestion}
            className="flex-1"
          >
            {currentQuestion === quizData.questions.length - 1 ? "View Results" : "Next Question"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
