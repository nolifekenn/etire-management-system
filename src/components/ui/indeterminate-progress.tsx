"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export function IndeterminateProgressBar({ className }: { className?: string }) {
    const [progress, setProgress] = React.useState(0)

    React.useEffect(() => {
        // Simulate loading progress
        const timer1 = setTimeout(() => setProgress(15), 100)
        const timer2 = setTimeout(() => setProgress(45), 800)
        const timer3 = setTimeout(() => setProgress(78), 1800)
        const timer4 = setTimeout(() => setProgress(92), 3500)

        return () => {
            clearTimeout(timer1)
            clearTimeout(timer2)
            clearTimeout(timer3)
            clearTimeout(timer4)
        }
    }, [])

    return (
        <div className={cn("w-full flex items-center justify-center", className)}>
            <Progress value={progress} className="h-2 w-full transition-all duration-1000 ease-out" />
        </div>
    )
}
