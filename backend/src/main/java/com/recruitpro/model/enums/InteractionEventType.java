package com.recruitpro.model.enums;

public enum InteractionEventType {
    click,
    save,
    apply;

    public boolean isApply() {
        return this == apply;
    }

    public boolean usesSoftAttribution() {
        return this == click || this == save;
    }

    /** Returns true only for events that create graph edges for GraphSAGE training.
     *  Only apply events create graph edges. Click and save are user-level behavioral
     *  signals stored separately and used only in preference-vector logic. */
    public boolean isGraphEdge() {
        return this == apply;
    }
}
