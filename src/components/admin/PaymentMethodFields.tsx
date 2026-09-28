import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentMethod, type PaymentMethod } from "@/lib/payment-methods";

/** Campos "Forma de pagamento" + "Parcelas" usados nos formulários financeiros. */
export function PaymentMethodFields({
  methods,
  method,
  installments,
  onChange,
}: {
  methods: PaymentMethod[];
  method: string;
  installments: string;
  onChange: (value: { method: string; installments: string }) => void;
}) {
  // Mantém visível a forma já salva, mesmo que ela tenha sido desativada depois.
  const current = paymentMethod(method);
  const options =
    current && !methods.some((m) => m.id === current.id) ? [...methods, current] : methods;
  const allowsInstallments = current?.installments ?? false;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className={`space-y-1.5 ${allowsInstallments ? "" : "col-span-2"}`}>
        <Label>Forma de pagamento</Label>
        <Select
          value={method || "nao_informada"}
          onValueChange={(v) =>
            onChange({
              method: v === "nao_informada" ? "" : v,
              installments: paymentMethod(v)?.installments ? installments || "1" : "",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nao_informada">Não informada</SelectItem>
            {options.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.emoji} {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {allowsInstallments && (
        <div className="space-y-1.5">
          <Label htmlFor="pm-installments">Parcelas</Label>
          <Input
            id="pm-installments"
            type="number"
            min={1}
            max={48}
            value={installments}
            onChange={(e) => onChange({ method, installments: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
