# Generated manually for SIS ENSET

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MessageInterne',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('objet', models.CharField(max_length=180)),
                ('contenu', models.TextField()),
                ('lu', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('destinataire', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages_recus', to=settings.AUTH_USER_MODEL)),
                ('expediteur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages_envoyes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Message interne',
                'verbose_name_plural': 'Messages internes',
                'ordering': ['-created_at'],
            },
        ),
    ]
