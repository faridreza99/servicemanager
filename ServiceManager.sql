--
-- PostgreSQL database dump
--

\restrict VEUEzF32c67K5Zp6yxnfCV9lOg36ZUk1uzJKigIOYF4G5KWST7Y2QA53NT1cfnD

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE public.booking_status OWNER TO postgres;

--
-- Name: contact_message_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contact_message_status AS ENUM (
    'pending',
    'read',
    'replied',
    'closed'
);


ALTER TYPE public.contact_message_status OWNER TO postgres;

--
-- Name: notification_setting_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_setting_type AS ENUM (
    'email',
    'whatsapp'
);


ALTER TYPE public.notification_setting_type OWNER TO postgres;

--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_type AS ENUM (
    'booking',
    'message',
    'task',
    'approval'
);


ALTER TYPE public.notification_type OWNER TO postgres;

--
-- Name: service_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.service_category AS ENUM (
    'hardware',
    'software',
    'network',
    'security',
    'cloud',
    'consulting',
    'maintenance',
    'other'
);


ALTER TYPE public.service_category OWNER TO postgres;

--
-- Name: task_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_status AS ENUM (
    'pending',
    'in_progress',
    'completed'
);


ALTER TYPE public.task_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'customer',
    'admin',
    'staff'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    customer_id character varying NOT NULL,
    service_id character varying NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
    assigned_staff_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    scheduled_date timestamp without time zone,
    notes text
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: chats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chats (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    booking_id character varying NOT NULL,
    is_open boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    closed_at timestamp without time zone
);


ALTER TABLE public.chats OWNER TO postgres;

--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    subject text NOT NULL,
    message text NOT NULL,
    status public.contact_message_status DEFAULT 'pending'::public.contact_message_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contact_messages OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    chat_id character varying NOT NULL,
    sender_id character varying NOT NULL,
    content text NOT NULL,
    is_private boolean DEFAULT false NOT NULL,
    is_quotation boolean DEFAULT false NOT NULL,
    quotation_amount integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    attachment_url text,
    attachment_type text
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    type public.notification_setting_type NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    config text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notification_settings OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    type public.notification_type NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: page_content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_content (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    page_key text NOT NULL,
    section_key text NOT NULL,
    content text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.page_content OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    service_id character varying NOT NULL,
    user_id character varying NOT NULL,
    rating integer NOT NULL,
    title text,
    body text,
    is_published boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    category public.service_category DEFAULT 'other'::public.service_category NOT NULL
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.site_settings OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    booking_id character varying NOT NULL,
    staff_id character varying NOT NULL,
    description text NOT NULL,
    status public.task_status DEFAULT 'pending'::public.task_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public.user_role DEFAULT 'customer'::public.user_role NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    phone text,
    profile_photo text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, customer_id, service_id, status, assigned_staff_id, created_at, scheduled_date, notes) FROM stdin;
fabe5924-b918-4965-9bfc-8b879935b094	5323e201-5503-4882-84e8-5c5bee827789	efa37f67-7608-4e5b-82f8-dd115eb94d6a	confirmed	89bffe50-0075-4ce4-95f7-23c4063d6695	2025-12-07 06:37:36.473436	\N	\N
5e604ee7-c534-4292-8d2a-ccb134c34ad6	742e6822-6f26-4248-9e73-2b12a6852928	efa37f67-7608-4e5b-82f8-dd115eb94d6a	confirmed	89bffe50-0075-4ce4-95f7-23c4063d6695	2025-12-07 07:50:07.582467	\N	\N
30e55caa-a60d-448b-97fa-2fb45123bb69	742e6822-6f26-4248-9e73-2b12a6852928	efa37f67-7608-4e5b-82f8-dd115eb94d6a	confirmed	89bffe50-0075-4ce4-95f7-23c4063d6695	2025-12-07 10:30:30.15772	\N	\N
\.


--
-- Data for Name: chats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chats (id, booking_id, is_open, created_at, closed_at) FROM stdin;
af6126eb-a9c9-465e-919c-a7f718dcd60a	fabe5924-b918-4965-9bfc-8b879935b094	f	2025-12-07 06:37:47.145676	2025-12-07 07:35:59.289
219a1fa6-0987-4d69-b9da-6213428cdc25	5e604ee7-c534-4292-8d2a-ccb134c34ad6	f	2025-12-07 07:50:07.598872	2025-12-07 09:30:48.636
24cb01d3-a095-4d2a-ae5b-14997d913109	30e55caa-a60d-448b-97fa-2fb45123bb69	f	2025-12-07 10:30:30.172333	2025-12-07 11:11:01.87
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contact_messages (id, name, email, phone, subject, message, status, created_at) FROM stdin;
adfa5fa7-3e89-4171-a461-6c2313e70c9b	Test User 1hX9xv	testfjNpKc@example.com		Test Inquiry	This is a test message for the contact form.	pending	2025-12-07 12:05:14.358469
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, chat_id, sender_id, content, is_private, is_quotation, quotation_amount, created_at, attachment_url, attachment_type) FROM stdin;
44cd4dd5-e986-4a4c-9cc4-b7cff84775e5	af6126eb-a9c9-465e-919c-a7f718dcd60a	56cfaa69-b124-4801-bce9-c20fb822d5b3	Automated test message from admin	f	f	\N	2025-12-07 06:47:23.082666	\N	\N
cd12a7b3-d0c8-4bcf-89d1-396e9ebb207a	af6126eb-a9c9-465e-919c-a7f718dcd60a	56cfaa69-b124-4801-bce9-c20fb822d5b3	Test message with attachment	f	f	\N	2025-12-07 06:52:26.588544	\N	\N
0322a7e1-4fac-45c0-800d-d9b0d1e0bb24	af6126eb-a9c9-465e-919c-a7f718dcd60a	56cfaa69-b124-4801-bce9-c20fb822d5b3	Shared a file	f	f	\N	2025-12-07 06:56:02.16703	\N	\N
bd264e4c-3c41-4aa4-a90e-12cc11eb6f75	af6126eb-a9c9-465e-919c-a7f718dcd60a	56cfaa69-b124-4801-bce9-c20fb822d5b3	Shared a file	f	f	\N	2025-12-07 07:03:18.865457	/objects/uploads/fe65bca3-7d7d-4f90-9f64-f43b6f464eea	image/png
923ce9fc-005b-4382-ad51-1ce108f70f82	219a1fa6-0987-4d69-b9da-6213428cdc25	742e6822-6f26-4248-9e73-2b12a6852928	Hello give me quation	f	f	\N	2025-12-07 07:50:17.645472	\N	\N
3af30714-7d02-42fc-884c-94a45ccbfc9c	219a1fa6-0987-4d69-b9da-6213428cdc25	56cfaa69-b124-4801-bce9-c20fb822d5b3		f	t	250	2025-12-07 07:58:10.272706	\N	\N
99ad5202-81c7-4df7-a8c6-c080aa5a9e41	219a1fa6-0987-4d69-b9da-6213428cdc25	742e6822-6f26-4248-9e73-2b12a6852928	give me chating	f	f	\N	2025-12-07 08:45:53.261198	\N	\N
91cdd835-3589-4faf-a03e-075cdab5a240	219a1fa6-0987-4d69-b9da-6213428cdc25	56cfaa69-b124-4801-bce9-c20fb822d5b3	work on that i have assign staff	f	f	\N	2025-12-07 08:46:08.583296	\N	\N
6b6c1581-68f4-446a-9f9e-47174c8a316b	219a1fa6-0987-4d69-b9da-6213428cdc25	56cfaa69-b124-4801-bce9-c20fb822d5b3	seee	f	f	\N	2025-12-07 08:53:12.051666	/objects/uploads/b197bc5b-1441-45a5-8d49-1c9f4c8bd867	image/png
8a8d317d-05fb-4ce3-9147-4431ca017f7c	219a1fa6-0987-4d69-b9da-6213428cdc25	56cfaa69-b124-4801-bce9-c20fb822d5b3	i have done the work	f	f	\N	2025-12-07 09:00:30.107656	https://res.cloudinary.com/dxn7swwvn/image/upload/v1765098022/chat-uploads/bnwik3gmbhbqhs4gty2k.png	image/png
c8827e9d-66da-44fc-8577-a77d8541de82	24cb01d3-a095-4d2a-ae5b-14997d913109	742e6822-6f26-4248-9e73-2b12a6852928	how are you	f	f	\N	2025-12-07 10:31:20.434034	\N	\N
90dc56d9-dd68-46a3-935e-2f47296d6882	24cb01d3-a095-4d2a-ae5b-14997d913109	56cfaa69-b124-4801-bce9-c20fb822d5b3	i am good 	f	f	\N	2025-12-07 10:31:27.385089	\N	\N
dbc37bf8-de6a-4c0a-845d-aab0d17d2e73	24cb01d3-a095-4d2a-ae5b-14997d913109	89bffe50-0075-4ce4-95f7-23c4063d6695	i am on it	f	f	\N	2025-12-07 10:38:58.374533	\N	\N
49660b8d-306b-4b57-aa93-a2d09f01eb9a	24cb01d3-a095-4d2a-ae5b-14997d913109	89bffe50-0075-4ce4-95f7-23c4063d6695	work on it	f	f	\N	2025-12-07 10:39:58.037676	\N	\N
bb246226-406d-428b-b875-61b9d997fe2d	24cb01d3-a095-4d2a-ae5b-14997d913109	89bffe50-0075-4ce4-95f7-23c4063d6695	how much money	t	f	\N	2025-12-07 10:40:28.997085	\N	\N
\.


--
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_settings (id, type, enabled, config, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, title, content, read, created_at) FROM stdin;
e70b516d-8fd5-49b5-8221-42878da1b668	56cfaa69-b124-4801-bce9-c20fb822d5b3	approval	New User Registration	jhon (jhon@test.com) has registered and awaits approval.	t	2025-12-07 07:44:16.297097
eaef01e6-97a7-4e43-8980-a25e34aaf517	89bffe50-0075-4ce4-95f7-23c4063d6695	approval	Account Approved	Your account has been approved. You can now access all features.	f	2025-12-07 07:46:44.953901
d324c508-862c-49a4-a334-9f7e5b6174b7	89bffe50-0075-4ce4-95f7-23c4063d6695	booking	New Assignment	You have been assigned to a new booking.	f	2025-12-07 07:46:59.704265
3ebd48a0-1a2d-4a34-9a91-4778dddbf233	5323e201-5503-4882-84e8-5c5bee827789	booking	Staff Assigned	A staff member has been assigned to your booking.	f	2025-12-07 07:46:59.707978
c4f67a1d-0741-4522-beb0-705b0dd7125a	89bffe50-0075-4ce4-95f7-23c4063d6695	booking	New Assignment	You have been assigned to a new booking.	f	2025-12-07 07:47:06.337191
d0d43570-9358-474e-af7c-ad2273eac899	5323e201-5503-4882-84e8-5c5bee827789	booking	Staff Assigned	A staff member has been assigned to your booking.	f	2025-12-07 07:47:06.344859
ec03a9e4-f67b-4f3b-beee-488da0a73c18	56cfaa69-b124-4801-bce9-c20fb822d5b3	approval	New User Registration	Max (Max@test.com) has registered and awaits approval.	t	2025-12-07 07:46:21.47663
db837fa8-6bba-4dc5-aa9b-95577804254b	56cfaa69-b124-4801-bce9-c20fb822d5b3	booking	New Booking	A new service booking has been created.	t	2025-12-07 07:50:07.606855
b977cf94-5e6d-450c-affe-3afde078a053	742e6822-6f26-4248-9e73-2b12a6852928	approval	Account Approved	Your account has been approved. You can now access all features.	t	2025-12-07 07:44:27.673384
f446c7b4-171b-4177-bfcd-5ca4e8416e9a	742e6822-6f26-4248-9e73-2b12a6852928	booking	Staff Assigned	A staff member has been assigned to your booking.	t	2025-12-07 07:51:23.104999
cc6ce54b-f970-45d6-bc09-8b0e4db1e5af	89bffe50-0075-4ce4-95f7-23c4063d6695	booking	New Assignment	You have been assigned to a new booking.	t	2025-12-07 07:51:23.099465
9141b3eb-7741-4924-8b28-2007806e3c63	56cfaa69-b124-4801-bce9-c20fb822d5b3	booking	New Booking	A new service booking has been created.	f	2025-12-07 10:30:30.178661
8ea91ea9-4328-47b7-8e1b-01e8441d5978	89bffe50-0075-4ce4-95f7-23c4063d6695	task	New Task Assigned	You have been assigned a new task for booking.	f	2025-12-07 10:31:47.956345
f01695ed-96c6-4211-86a8-2fc50270d6ee	742e6822-6f26-4248-9e73-2b12a6852928	booking	Staff Assigned	A staff member has been assigned to your booking.	t	2025-12-07 10:31:47.963066
347fdddb-b871-450c-b259-b1d1f33a5a7d	56cfaa69-b124-4801-bce9-c20fb822d5b3	message	New Contact Form Submission	Test User 1hX9xv (testfjNpKc@example.com) sent a message: "Test Inquiry"	f	2025-12-07 12:05:14.376735
\.


--
-- Data for Name: page_content; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.page_content (id, page_key, section_key, content, updated_at) FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (id, service_id, user_id, rating, title, body, is_published, created_at) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (id, name, description, is_active, created_at, updated_at, category) FROM stdin;
efa37f67-7608-4e5b-82f8-dd115eb94d6a	Hardware Test 35R5-m	This is a test hardware service for filtering verification	t	2025-12-07 06:16:45.523195	2025-12-07 07:45:04.5	hardware
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_settings (id, key, value, updated_at) FROM stdin;
6cdbf102-4378-49f3-b269-e29fedafe726	siteName	IT Service Management	2025-12-07 11:46:52.999827
3c723e0d-8e35-4512-bc85-e9b6ae518475	siteDescription	Professional IT service management platform	2025-12-07 11:46:53.014196
f19299a9-8f82-497e-b3cd-b2ce99f73edf	logoUrl	https://res.cloudinary.com/dxn7swwvn/image/upload/v1765108005/chat-uploads/kbhlrwvvtuez9gdrxxio.jpg	2025-12-07 11:46:53.022909
3c04afaa-38d1-436b-821b-f14c3b7d8ee0	faviconUrl	https://res.cloudinary.com/dxn7swwvn/image/upload/v1765108009/chat-uploads/plne4qsxfel0cl3z6e21.jpg	2025-12-07 11:46:53.027642
d29a245f-3668-4ea1-908b-02fc3e56ad33	metaTitle	IT Service Management	2025-12-07 11:46:53.032843
b68d5762-fc9e-417f-b696-ed7be86d50bc	metaDescription	Book and manage IT services with ease	2025-12-07 11:46:53.036465
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, booking_id, staff_id, description, status, created_at, completed_at) FROM stdin;
831c2778-fbd3-41a8-bd27-648aaa52f31b	30e55caa-a60d-448b-97fa-2fb45123bb69	89bffe50-0075-4ce4-95f7-23c4063d6695	Service: Hardware Test 35R5-m - Complete service for jhon	in_progress	2025-12-07 10:31:47.949668	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, name, role, approved, created_at, phone, profile_photo) FROM stdin;
5323e201-5503-4882-84e8-5c5bee827789	testcustomer@test.com	$2b$10$YVNuOMxl5W8IqqZjRf5I2.x0H6hwNFJh9WM8cWG4rj8Y8f/vy0p6y	Test Customer	customer	t	2025-12-07 06:37:03.838938	\N	\N
742e6822-6f26-4248-9e73-2b12a6852928	jhon@test.com	$2b$10$1Otu9DxO2Tx3wJ1ikNHUiu8FuijyTRwmcRPggf0Bxa4VsZt7QiU/q	jhon	customer	t	2025-12-07 07:44:16.267616	+8801875231579	\N
56cfaa69-b124-4801-bce9-c20fb822d5b3	admin@test.com	$2b$10$tNKr.BdPN6M0pi/jGEmNI.h2YCKpIPJVRZu3VqLQTr.hkiC0f1wEK	MaxtechBD	admin	t	2025-12-07 06:15:04.092708		https://res.cloudinary.com/dxn7swwvn/image/upload/v1765105558/chat-uploads/ca26ibf5s5clu9fz0xyj.png
89bffe50-0075-4ce4-95f7-23c4063d6695	Max@test.com	$2b$10$n7G7xPU0OAUYTe8BOliree9xN3P5bEmRhUEybu79C6NN3mxQKyf7W	Max	staff	t	2025-12-07 07:46:21.456738	01875231579	https://res.cloudinary.com/dxn7swwvn/image/upload/v1765109370/chat-uploads/gofvh6h1jzb7mqwhgtvv.png
\.


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: chats chats_booking_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_booking_id_unique UNIQUE (booking_id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_type_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_type_unique UNIQUE (type);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: page_content page_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_content
    ADD CONSTRAINT page_content_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_unique UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_assigned_staff_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_assigned_staff_id_users_id_fk FOREIGN KEY (assigned_staff_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_customer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_users_id_fk FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: chats chats_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: messages messages_chat_id_chats_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_chats_id_fk FOREIGN KEY (chat_id) REFERENCES public.chats(id);


--
-- Name: messages messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: reviews reviews_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: tasks tasks_staff_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_staff_id_users_id_fk FOREIGN KEY (staff_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict VEUEzF32c67K5Zp6yxnfCV9lOg36ZUk1uzJKigIOYF4G5KWST7Y2QA53NT1cfnD

