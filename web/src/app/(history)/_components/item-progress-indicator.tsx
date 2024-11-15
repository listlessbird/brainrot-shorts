import { motion } from "framer-motion";
import { AlertCircle, Check, Loader2 } from "lucide-react";

export function ItemProgressIndicator({
  status,
  message,
}: {
  status: string;
  message: string;
}) {
  const colors = {
    info: "bg-blue-500",
    error: "bg-red-500",
    success: "bg-green-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 p-4 rounded-lg bg-card"
    >
      <div
        className={`${colors[status as keyof typeof colors]} p-2 rounded-full`}
      >
        {status === "error" && (
          <AlertCircle className="size-4 h-4 text-white" />
        )}
        {status === "success" && <Check className="size-4 text-white" />}
        {status === "info" && (
          <Loader2 className="size-4 text-white animate-spin" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  );
}
