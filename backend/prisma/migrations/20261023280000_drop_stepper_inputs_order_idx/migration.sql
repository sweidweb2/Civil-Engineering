-- Non-unique (stepId, orderNb) index is redundant after @@unique([stepId, orderNb]).
DROP INDEX IF EXISTS "stepper_inputs_stepId_orderNb_idx";
