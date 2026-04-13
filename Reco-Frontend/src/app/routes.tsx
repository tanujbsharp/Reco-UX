import React from "react";
import { createBrowserRouter, Outlet, ScrollRestoration } from "react-router";
import { JourneyProvider } from "./context/JourneyContext";
import { LandingScreen } from "./screens/LandingScreen";
import { ConsentScreen } from "./screens/ConsentScreen";
import { DiscoveryModeScreen } from "./screens/DiscoveryModeScreen";
import { VoiceDiscoveryScreen } from "./screens/VoiceDiscoveryScreen";
import { VoiceResultsScreen } from "./screens/VoiceResultsScreen";
import { GuidedQuestionsScreen } from "./screens/GuidedQuestionsScreen";
import { ProcessingScreen } from "./screens/ProcessingScreen";
import { RecommendationsScreen } from "./screens/RecommendationsScreen";
import { ProductDetailScreen } from "./screens/ProductDetailScreen";
import { ComparisonScreen } from "./screens/ComparisonScreen";
import { LeadCaptureScreen } from "./screens/LeadCaptureScreen";
import { ShareSaveScreen } from "./screens/ShareSaveScreen";
import { ConfirmationScreen } from "./screens/ConfirmationScreen";

function RootLayout() {
  return (
    <JourneyProvider>
      <ScrollRestoration />
      <Outlet />
    </JourneyProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        Component: LandingScreen,
      },
      {
        path: "/consent",
        Component: ConsentScreen,
      },
      {
        path: "/discover-mode",
        Component: DiscoveryModeScreen,
      },
      {
        path: "/voice-discovery",
        Component: VoiceDiscoveryScreen,
      },
      {
        path: "/voice-results",
        Component: VoiceResultsScreen,
      },
      {
        path: "/questions",
        Component: GuidedQuestionsScreen,
      },
      {
        path: "/processing",
        Component: ProcessingScreen,
      },
      {
        path: "/recommendations",
        Component: RecommendationsScreen,
      },
      {
        path: "/product/:id",
        Component: ProductDetailScreen,
      },
      {
        path: "/comparison",
        Component: ComparisonScreen,
      },
      {
        path: "/handoff",
        Component: LeadCaptureScreen,
      },
      {
        path: "/lead-capture",
        Component: LeadCaptureScreen,
      },
      {
        path: "/share",
        Component: ShareSaveScreen,
      },
      {
        path: "/complete",
        Component: ConfirmationScreen,
      },
      {
        path: "/confirmation",
        Component: ConfirmationScreen,
      },
    ],
  },
]);
