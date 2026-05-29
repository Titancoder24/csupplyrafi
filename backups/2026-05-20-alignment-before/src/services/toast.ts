export type ToastMsg = {
  id: string;
  title: string;
  body?: string;
  type: 'info' | 'success' | 'warning' | 'error';
};

type Listener = (msg: ToastMsg) => void;
let _listener: Listener | null = null;

export const toast = {
  show(title: string, body?: string, type: ToastMsg['type'] = 'info') {
    _listener?.({ id: `${Date.now()}-${Math.random()}`, title, body, type });
  },
  success(title: string, body?: string) { toast.show(title, body, 'success'); },
  error(title: string, body?: string)   { toast.show(title, body, 'error'); },
  warning(title: string, body?: string) { toast.show(title, body, 'warning'); },
  _register(fn: Listener)  { _listener = fn; },
  _unregister()            { _listener = null; },
};
