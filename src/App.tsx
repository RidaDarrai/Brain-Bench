import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProgressPage from './pages/ProgressPage';
import TestPage from './pages/TestPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/test/:testId" element={<TestPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
