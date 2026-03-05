"use client";

import { Button } from "@mui/material";
import { healthcheck } from "../api/healthcheck";
import React from "react";

export default function HealthcheckButton() {
  const [loading, setLoading] = React.useState(false);
  const [value, setValue] = React.useState<any>("Healthcheck");

  const callback = React.useCallback(async () => {
    setLoading(true);
    await healthcheck().then((res) => {
      setValue(res.message);
      setLoading(false);
    }).catch((err) => {
      setValue(err.message);
    }).finally(() => {
      setLoading(false);
    })
  }, [])

  return (
    <>
      <Button
        loading={loading}
        variant="contained"
        color="primary"
        onClick={callback}
      >
        {value}
      </Button>
    </>
  );
}
