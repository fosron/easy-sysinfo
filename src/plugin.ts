import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { SysInfoWidget } from "./actions/sys-info-widget";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the increment action.
streamDeck.actions.registerAction(new SysInfoWidget());

// Finally, connect to the Stream Deck.
streamDeck.connect();
