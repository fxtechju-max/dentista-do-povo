import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Phone, Plus, Pencil, Trash2, Search, Info } from "lucide-react";
import { db } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/whatsapp")({
  component: WhatsApp,
});

type Contact = {
  id: string;
  name: string;
  phone: string;
  last_message: string | null;
  last_contact_at: string;
};

const emptyForm = { name: "", phone: "", last_message: "" };

function WhatsApp() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await db
      .from("whatsapp_contacts")
      .select("id, name, phone, last_message, last_contact_at")
      .order("last_contact_at", { ascending: false });
    setContacts((data ?? []) as Contact[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [contacts, query]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, last_message: c.last_message ?? "" });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      last_message: form.last_message.trim() || null,
      last_contact_at: new Date().toISOString(),
    };
    if (editing) {
      await db.from("whatsapp_contacts").update(payload).eq("id", editing.id);
    } else {
      await db.from("whatsapp_contacts").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function remove() {
    if (!deleteTarget) return;
    await db.from("whatsapp_contacts").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="📱 WhatsApp"
        description="Registro interno de contatos e conversas por WhatsApp."
        action={
          <Button onClick={openCreate}>
            <Plus /> Novo contato
          </Button>
        }
      />

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Este módulo ainda não está conectado à API oficial do WhatsApp Business — por enquanto é
          um registro manual dos contatos. Para integrar de verdade, é preciso uma conta WhatsApp
          Business API (Meta) e suas credenciais.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nome ou telefone..."
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} contato(s)</span>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando...
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState icon={Phone} title="Nenhum contato registrado ainda." />
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="animate-in fade-in flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="min-w-0">
                <p className="font-bold">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.phone}</p>
                {c.last_message && <p className="mt-2 text-sm text-foreground">{c.last_message}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Último contato: {new Date(c.last_contact_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(c)}
                  aria-label="Excluir"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar contato" : "Novo contato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-name">Nome</Label>
              <Input
                id="w-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-phone">Telefone</Label>
              <Input
                id="w-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-message">Última mensagem</Label>
              <Textarea
                id="w-message"
                value={form.last_message}
                onChange={(e) => setForm((f) => ({ ...f, last_message: e.target.value }))}
                placeholder="Resumo da conversa..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!form.name.trim() || !form.phone.trim() || saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
