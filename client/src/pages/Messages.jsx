import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Send,
  Users,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Avatar,
  Button,
  Empty,
  ErrorState,
  Heading,
  Loading,
  useToast,
} from "../components/ui";
export function ChatPane({ conversationId, title = "Conversation" }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [typing, setTyping] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef();
  const bottom = useRef();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["messages", conversationId, page],
    queryFn: () =>
      api("/conversations/" + conversationId + "/messages?page=" + page),
    enabled: !!conversationId,
  });
  useEffect(() => {
    setPage(1);
    setText("");
    setTyping("");
  }, [conversationId]);
  useEffect(() => {
    if (!user || !conversationId) return;
    const socket = io({ withCredentials: true });
    socketRef.current = socket;
    let timer;
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("conversation:join", { conversationId });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("message:new", (message) => {
      cache.invalidateQueries({ queryKey: ["conversations"] });
      cache.invalidateQueries({ queryKey: ["notifications"] });
      if (message.conversation === conversationId) {
        setPage(1);
        cache.invalidateQueries({ queryKey: ["messages", conversationId] });
      }
    });
    socket.on("typing", (event) => {
      if (event.conversationId !== conversationId) return;
      setTyping(event.typing ? event.user : "");
      clearTimeout(timer);
      timer = setTimeout(() => setTyping(""), 2500);
    });
    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
  }, [conversationId, user?._id, cache]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    cache.invalidateQueries({ queryKey: ["conversations"] });
  }, [data?.items?.length, conversationId]);
  async function send(event) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api("/conversations/" + conversationId + "/messages", "POST", {
        text,
      });
      setText("");
      setPage(1);
      cache.invalidateQueries({ queryKey: ["messages", conversationId] });
      cache.invalidateQueries({ queryKey: ["conversations"] });
      socketRef.current?.emit("typing", { conversationId, typing: false });
    } catch (e) {
      toast(e.message);
    } finally {
      setSending(false);
    }
  }
  if (!conversationId)
    return (
      <Empty
        title="A good conversation starts with hello."
        description="Choose a conversation or visit someone’s profile to send your first message."
      />
    );
  return (
    <section className="chat-pane">
      <div className="chat-heading">
        <span className="chat-icon">
          <MessageSquare size={18} />
        </span>
        <div>
          <strong>{title}</strong>
          <small>
            <i className={connected ? "online" : ""} />
            {connected ? "Live conversation" : "Connecting to live updates…"}
          </small>
        </div>
      </div>
      <div className="message-history">
        {data?.pages > 1 && (
          <div className="message-pagination">
            <Button
              variant="ghost"
              disabled={page >= data.pages}
              onClick={() => setPage(page + 1)}
            >
              Earlier messages
            </Button>
            {page > 1 && (
              <Button variant="ghost" onClick={() => setPage(page - 1)}>
                Newer messages
              </Button>
            )}
          </div>
        )}
        {isPending ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} retry={refetch} />
        ) : data?.items?.length ? (
          data.items.map((m) => (
            <div
              className={"message " + (m.sender._id === user._id ? "mine" : "")}
              key={m._id}
            >
              <Avatar user={m.sender} size="tiny" />
              <div>
                <span>
                  {m.sender.name}
                  <time>
                    {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </span>
                <p>{m.text}</p>
              </div>
            </div>
          ))
        ) : (
          <Empty
            title="Be the first to say hello."
            description="Share an idea, ask a question, or start something great."
          />
        )}
        <div ref={bottom} />
      </div>
      <div className="typing-indicator" aria-live="polite">
        {typing ? typing + " is typing…" : " "}
      </div>
      <form className="message-composer" onSubmit={send}>
        <input
          aria-label="Message"
          placeholder="A good idea starts with a message…"
          value={text}
          maxLength={4000}
          onChange={(e) => {
            setText(e.target.value);
            socketRef.current?.emit("typing", {
              conversationId,
              typing: !!e.target.value,
            });
          }}
        />
        <Button
          loading={sending}
          disabled={!text.trim()}
          aria-label="Send message"
        >
          <Send size={17} />
        </Button>
      </form>
    </section>
  );
}
export default function Messages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const selected = params.get("conversation");
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api("/conversations"),
    refetchInterval: 15000,
  });
  const active = data?.items.find((c) => c._id === selected);
  const name = (c) =>
    c.kind === "project"
      ? c.project?.title || "Project discussion"
      : c.participants.find((p) => p._id !== user._id)?.name || "Conversation";
  return (
    <>
      <Heading
        eyebrow="GOOD THINGS START WITH HELLO"
        title="Keep the ideas flowing."
        description="Your people. Your conversations. One place."
      />
      <div className={"messages-layout " + (selected ? "has-selection" : "")}>
        <aside className="conversation-list">
          {isPending ? (
            <Loading />
          ) : error ? (
            <ErrorState error={error} retry={refetch} />
          ) : data?.items.length ? (
            data.items.map((c) => (
              <button
                className={selected === c._id ? "active" : ""}
                key={c._id}
                onClick={() => setParams({ conversation: c._id })}
              >
                {c.kind === "project" ? (
                  <span className="avatar">
                    <Users size={17} />
                  </span>
                ) : (
                  <Avatar
                    user={c.participants.find((p) => p._id !== user._id)}
                  />
                )}
                <span>
                  <strong>{name(c)}</strong>
                  <small>{c.lastMessage || "Start the conversation"}</small>
                </span>
                {c.unread > 0 && <i>{c.unread}</i>}
              </button>
            ))
          ) : (
            <Empty
              title="Your inbox has room for possibility."
              description="Find someone interesting and say hello."
              action={
                <Link className="text-link" to="/people">
                  Meet the community
                  <ArrowRight size={15} />
                </Link>
              }
            />
          )}
        </aside>
        <div className="conversation-detail">
          {selected && (
            <button className="chat-back" onClick={() => setParams({})}>
              <ArrowLeft size={14} />
              All conversations
            </button>
          )}
          <ChatPane
            conversationId={selected}
            title={active ? name(active) : "Conversation"}
          />
        </div>
      </div>
    </>
  );
}
